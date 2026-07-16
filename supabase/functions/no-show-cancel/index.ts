// Edge Function: no-show-cancel (D-073 — revises D-071)
// The POSTER claims the chosen worker never showed up. Because the service was
// already PAID, this is NOT an instant refund — it opens a REAL refund dispute
// (kind 'no_show'): the gig freezes at `disputed`, the money stays held, and
// the worker can DEFEND before support decides (resolve-dispute). The refund +
// worker debt + no-show offense only happen if support rules for the poster.
//
// Eligible only when the gig is `accepted` (a candidate was chosen and PAID),
// the worker never started (`started_at` null) and the 30-min tolerance past
// the scheduled start has elapsed (canDeclareNoShow).
//
// Deploy: Management API multipart (verify_jwt=true).

import { createClient } from "npm:@supabase/supabase-js@2";

import { canDeclareNoShow, type GigStatus } from "../../../packages/core/src/gig.ts";

type ResultCode =
  | "opened"
  | "already_disputed"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_eligible"
  | "state_changed"
  | "invalid_request";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_REASON =
  "O prestador não apareceu para iniciar o serviço no horário combinado.";

function respond(code: ResultCode, status: number, extra: object = {}): Response {
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

  let gigId: unknown, reason: unknown;
  try {
    ({ gigId, reason } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string") return respond("invalid_request", 400);
  // The poster may add detail; otherwise a sensible default (the report is
  // required 20–2000 chars by the disputes table).
  let report = typeof reason === "string" && reason.trim() ? reason.trim() : DEFAULT_REASON;
  if (report.length < 20) report = DEFAULT_REASON;
  if (report.length > 2000) report = report.slice(0, 2000);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const userId = userData.user.id;

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, worker_id, status, starts_at, started_at")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (!gig.worker_id) return respond("not_eligible", 409);
  if (
    !canDeclareNoShow({
      status: gig.status as GigStatus,
      startsAt: gig.starts_at,
      startedAt: gig.started_at,
      now: new Date(),
    })
  ) {
    return respond("not_eligible", 409);
  }

  // Open the dispute (unique gig_id is the real lock) — no money moves.
  const { data: dispute, error: insertError } = await admin
    .from("disputes")
    .insert({ gig_id: gig.id, opener_id: userId, kind: "no_show", reason: report })
    .select("id")
    .maybeSingle();
  if (insertError || !dispute) {
    return insertError?.code === "23505"
      ? respond("already_disputed", 409)
      : respond("invalid_request", 400);
  }

  // Freeze the gig: accepted → disputed, flag the poster's no-show CLAIM.
  const { data: frozen } = await admin
    .from("gigs")
    .update({ status: "disputed", worker_no_show: true })
    .eq("id", gig.id)
    .eq("status", "accepted")
    .is("started_at", null)
    .select("id");
  if (!frozen || frozen.length === 0) {
    // Lost the race (e.g. worker started meanwhile): undo the dispute row.
    await admin.from("disputes").delete().eq("id", dispute.id);
    return respond("state_changed", 409);
  }

  // Let the worker know a dispute was opened (notification center + push).
  // The app renders the pt-BR text from `type` + the gig title.
  await admin.from("notifications").insert({
    user_id: gig.worker_id,
    gig_id: gig.id,
    type: "dispute_opened",
  });

  return respond("opened", 200, { disputeId: dispute.id });
});
