// Edge Function: support-panel-action — Painel do Suporte (docs/09 S4).
//
// Todas as escritas do painel passam por aqui, com o service role e SEMPRE
// checando profiles.is_admin do chamador; cada ação vira uma linha em
// support_actions (auditoria). Ações:
//   - resolve_report  { reportId, decision: 'actioned'|'dismissed', note? }
//   - reply_ticket    { ticketId, body }         (mensagem 'agent')
//   - resolve_ticket  { ticketId }               (fecha o ticket)
//   - cancel_gig      { gigId, note? }            (desbloqueio sem dinheiro)
//
// Segurança do dinheiro (D-040): cancel_gig só age em vagas SEM dinheiro
// movido (open / pending_approval). Vaga paga/aceita ou pending_payment
// continua pelo fluxo de disputa — o painel nunca move dinheiro ad hoc.

import { createClient } from "npm:@supabase/supabase-js@2";

type Code =
  | "ok"
  | "unauthorized"
  | "forbidden"
  | "invalid_request"
  | "not_found"
  | "needs_dispute"
  | "error";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(code: Code, status: number, extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ code, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const jwt = (request.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return respond("unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond("invalid_request", 400);
  }
  const action = body.action;
  if (typeof action !== "string") return respond("invalid_request", 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const adminId = userData.user.id;

  // Gate: caller MUST be a platform admin.
  const { data: prof } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", adminId)
    .maybeSingle();
  if (!prof?.is_admin) return respond("forbidden", 403);

  const log = (a: string, targetType: string | null, targetId: string | null, note?: string) =>
    admin.from("support_actions").insert({
      admin_id: adminId,
      action: a,
      target_type: targetType,
      target_id: targetId,
      note: note ?? null,
    });

  // ------------------------------------------------------- resolve_report
  if (action === "resolve_report") {
    const { reportId, decision, note } = body as {
      reportId?: string;
      decision?: string;
      note?: string;
    };
    if (typeof reportId !== "string" || (decision !== "actioned" && decision !== "dismissed")) {
      return respond("invalid_request", 400);
    }
    const { data: updated } = await admin
      .from("reports")
      .update({ status: decision, resolved_by: adminId, resolved_at: new Date().toISOString() })
      .eq("id", reportId)
      .eq("status", "pending")
      .select("id");
    if (!updated || updated.length === 0) return respond("not_found", 404);
    await log("resolve_report", "report", reportId, `${decision}${note ? `: ${note}` : ""}`);
    return respond("ok", 200);
  }

  // --------------------------------------------------------- reply_ticket
  if (action === "reply_ticket") {
    const { ticketId, replyBody } = body as { ticketId?: string; replyBody?: string };
    if (
      typeof ticketId !== "string" ||
      typeof replyBody !== "string" ||
      replyBody.trim().length === 0 ||
      replyBody.length > 2000
    ) {
      return respond("invalid_request", 400);
    }
    const { data: ticket } = await admin
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) return respond("not_found", 404);

    await admin.from("support_messages").insert({
      ticket_id: ticketId,
      sender: "agent",
      body: replyBody,
    });
    // Responder assume o ticket e mantém-no com o suporte até resolver.
    await admin
      .from("support_tickets")
      .update({
        status: "waiting_support",
        assigned_admin: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    await log("reply_ticket", "ticket", ticketId);
    return respond("ok", 200);
  }

  // ------------------------------------------------------- resolve_ticket
  if (action === "resolve_ticket") {
    const { ticketId } = body as { ticketId?: string };
    if (typeof ticketId !== "string") return respond("invalid_request", 400);
    const { data: updated } = await admin
      .from("support_tickets")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .select("id");
    if (!updated || updated.length === 0) return respond("not_found", 404);
    await log("resolve_ticket", "ticket", ticketId);
    return respond("ok", 200);
  }

  // ----------------------------------------------------------- cancel_gig
  if (action === "cancel_gig") {
    const { gigId, note } = body as { gigId?: string; note?: string };
    if (typeof gigId !== "string") return respond("invalid_request", 400);

    const { data: gig } = await admin
      .from("gigs")
      .select("id, status")
      .eq("id", gigId)
      .maybeSingle();
    if (!gig) return respond("not_found", 404);

    // Só desbloqueia vagas SEM dinheiro movido. O resto vai para disputa.
    if (gig.status !== "open" && gig.status !== "pending_approval") {
      return respond("needs_dispute", 409, { gigStatus: gig.status });
    }

    const { data: updated } = await admin
      .from("gigs")
      .update({
        status: "cancelled_by_poster",
        pending_candidacy_id: null,
        choice_pending_since: null,
      })
      .eq("id", gigId)
      .in("status", ["open", "pending_approval"])
      .select("id");
    if (!updated || updated.length === 0) return respond("needs_dispute", 409);

    // Encerra candidaturas pendentes desta vaga.
    await admin
      .from("gig_candidacies")
      .update({ status: "not_chosen" })
      .eq("gig_id", gigId)
      .eq("status", "pending");

    await log("cancel_gig", "gig", gigId, note);
    return respond("ok", 200);
  }

  return respond("invalid_request", 400);
});
