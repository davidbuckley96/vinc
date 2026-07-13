// Edge Function: send-push (Fase 4)
// Delivers an in-app notification to the user's registered devices via the
// Expo Push API. Triggered by pg_net from the `dispatch_push` trigger on
// `notifications` (so it fires for user actions AND the pg_cron jobs alike).
// Gated by the x-cron-secret header (same CRON_SECRET as run-money-jobs).
//
// Real on-device delivery needs an EAS build; until then the plumbing is
// exercised end-to-end (token registration + Expo ticket response).
//
// Deploy: verify_jwt=false (called by the DB, not a user).

import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Short pt-BR push copy per event type (mirrors the in-app labels). */
const PUSH_COPY: Record<string, (title: string) => { title: string; body: string }> = {
  new_candidate: (t) => ({ title: "Novo candidato", body: `Alguém se candidatou em "${t}".` }),
  chosen: (t) => ({ title: "Você foi escolhido! 🎉", body: `Você vai fazer "${t}".` }),
  not_chosen: (t) => ({ title: "Vaga preenchida", body: `Outra pessoa foi escolhida para "${t}".` }),
  service_started: (t) => ({ title: "Serviço iniciado", body: `"${t}" começou.` }),
  service_completed: (t) => ({ title: "Confirme a conclusão", body: `"${t}" foi marcado como concluído.` }),
  payment_released: (t) => ({ title: "Pagamento liberado 💰", body: `O valor de "${t}" caiu na sua carteira.` }),
  dispute_opened: (t) => ({ title: "Serviço contestado", body: `"${t}" foi contestado. O pagamento fica retido.` }),
  dispute_resolved: (t) => ({ title: "Contestação resolvida", body: `Veja a decisão de "${t}".` }),
  cancelled_by_poster: (t) => ({ title: "Vaga cancelada", body: `O anunciante cancelou "${t}".` }),
  cancelled_by_worker: (t) => ({ title: "Serviço cancelado", body: `O prestador cancelou "${t}".` }),
  gig_expired: (t) => ({ title: "Vaga expirada", body: `"${t}" expirou sem prestador.` }),
};

Deno.serve(async (request) => {
  if (request.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  let notificationId: unknown;
  try {
    ({ notificationId } = await request.json());
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (typeof notificationId !== "string") {
    return new Response("bad request", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: notif } = await admin
    .from("notifications")
    .select("user_id, type, gig_id")
    .eq("id", notificationId)
    .maybeSingle();
  if (!notif) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token")
    .eq("user_id", notif.user_id);
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  let gigTitle = "seu serviço";
  if (notif.gig_id) {
    const { data: gig } = await admin
      .from("gigs").select("title").eq("id", notif.gig_id).maybeSingle();
    if (gig?.title) gigTitle = gig.title;
  }

  const copy = (PUSH_COPY[notif.type] ?? ((t: string) => ({ title: "Vinc", body: t })))(gigTitle);
  const messages = tokens.map((row) => ({
    to: row.token,
    sound: "default",
    title: copy.title,
    body: copy.body,
    data: { gigId: notif.gig_id, type: notif.type },
  }));

  let tickets: Array<{ status?: string; details?: { error?: string } }> = [];
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json();
    tickets = json.data ?? [];
  } catch (err) {
    console.error("[send-push] expo error", err);
    return new Response(JSON.stringify({ sent: 0, error: true }), { status: 200 });
  }

  // Prune tokens Expo reports as dead (uninstalled / invalid).
  const dead: string[] = [];
  tickets.forEach((ticket, i) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      dead.push(messages[i].to);
    }
  });
  if (dead.length > 0) {
    await admin.from("push_tokens").delete().in("token", dead);
  }

  return new Response(JSON.stringify({ sent: messages.length, pruned: dead.length }), {
    status: 200,
  });
});
