// Edge Function: support-assistant — a "Vi" (docs/09, fase S3 · D-045).
//
// Recebe uma mensagem do usuário, mantém um ticket de suporte, chama a
// porta de IA (local por padrão; Claude Haiku com ANTHROPIC_API_KEY) e
// devolve a resposta. Escala para humano quando a Vi não dá conta ou o
// usuário pede — marcando o ticket como waiting_support.
//
// Writes usam o service role (não há policy de escrita direta do cliente
// em support_tickets/support_messages — só leitura das próprias linhas).
//
// Deploy: Management API multipart, com o _shared/assistant.ts anexado.

import { createClient } from "npm:@supabase/supabase-js@2";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  getAssistantProvider,
  type FaqArticle,
} from "../_shared/assistant.ts";

type ResultCode = "unauthorized" | "invalid_request" | "not_found" | "error";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fail(code: ResultCode, status: number): Response {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Resumo seguro do contexto — só dados do próprio usuário, nunca de
 * terceiros. Alimenta a Vi sem expor a base inteira. */
async function buildUserContext(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const [profile, asPoster, asWorker] = await Promise.all([
    admin.from("profiles").select("name").eq("id", userId).maybeSingle(),
    admin
      .from("gigs")
      .select("title, status, starts_at")
      .eq("poster_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("gigs")
      .select("title, status, starts_at")
      .eq("worker_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const lines: string[] = [];
  lines.push(`Nome: ${profile.data?.name ?? "(sem nome)"}`);

  const poster = asPoster.data ?? [];
  if (poster.length > 0) {
    lines.push("Vagas que anunciou (recentes):");
    for (const g of poster) lines.push(`  - "${g.title}" — status ${g.status}`);
  } else {
    lines.push("Ainda não anunciou vagas.");
  }

  const worker = asWorker.data ?? [];
  if (worker.length > 0) {
    lines.push("Serviços que pegou (recentes):");
    for (const g of worker) lines.push(`  - "${g.title}" — status ${g.status}`);
  } else {
    lines.push("Ainda não pegou serviços.");
  }

  return lines.join("\n");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const jwt = (request.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return fail("unauthorized", 401);

  let ticketId: unknown;
  let message: unknown;
  try {
    ({ ticketId, message } = await request.json());
  } catch {
    return fail("invalid_request", 400);
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return fail("invalid_request", 400);
  }
  if (message.length > 2000) return fail("invalid_request", 400);
  if (ticketId !== undefined && typeof ticketId !== "string") {
    return fail("invalid_request", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return fail("unauthorized", 401);
  const userId = userData.user.id;

  // ----------------------------------------------- ticket (get or create)
  let ticket: { id: string; status: string; user_id: string } | null = null;
  if (typeof ticketId === "string") {
    const { data } = await admin
      .from("support_tickets")
      .select("id, status, user_id")
      .eq("id", ticketId)
      .maybeSingle();
    if (!data || data.user_id !== userId) return fail("not_found", 404);
    ticket = data;
  } else {
    const { data, error } = await admin
      .from("support_tickets")
      .insert({ user_id: userId, status: "ai" })
      .select("id, status, user_id")
      .single();
    if (error || !data) {
      console.error("[support-assistant] create ticket", error);
      return fail("error", 500);
    }
    ticket = data;
  }

  // ----------------------------------------------- história + registro
  const { data: history } = await admin
    .from("support_messages")
    .select("sender, body")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  await admin.from("support_messages").insert({
    ticket_id: ticket.id,
    sender: "user",
    body: message,
  });

  // Já está com humano? A Vi não responde por cima — só registra e sai.
  if (ticket.status === "waiting_support") {
    await admin
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticket.id);
    return ok({ ticketId: ticket.id, reply: null, status: "waiting_support" });
  }

  // ----------------------------------------------- base + contexto + IA
  const { data: faqRows } = await admin
    .from("faq_articles")
    .select("question, answer, category")
    .order("sort_order", { ascending: true });
  const faq = (faqRows ?? []) as FaqArticle[];

  let userContext = "";
  try {
    userContext = await buildUserContext(admin, userId);
  } catch (err) {
    console.error("[support-assistant] context", err);
  }

  const provider = getAssistantProvider();
  const result = await provider.answer({
    userMessage: message,
    history: (history ?? []) as { sender: "user" | "ai" | "agent"; body: string }[],
    faq,
    userContext,
  });

  // ----------------------------------------------- grava resposta + estado
  await admin.from("support_messages").insert({
    ticket_id: ticket.id,
    sender: "ai",
    body: result.reply,
  });

  const nextStatus = result.escalate ? "waiting_support" : "ai";
  await admin
    .from("support_tickets")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", ticket.id);

  return ok({
    ticketId: ticket.id,
    reply: result.reply,
    status: nextStatus,
    escalated: result.escalate,
  });
});
