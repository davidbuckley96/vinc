// Edge Function: apply-gig
// Worker applies to an open gig (docs/02 §3, Uber-like — D-012). Guarantees:
//   - only authenticated users, never the poster themselves
//   - refused candidates can never re-apply to this gig
//   - blocked pairs (either direction) can't apply
//   - schedule-conflict check incl. the worker's own pending candidacies
//   - atomic lock: UPDATE ... WHERE status='open' — one candidate at a time;
//     while pending, the gig is out of listings and nobody else can apply
// No money moves here: escrow is held at APPROVAL (respond-candidacy).
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { SCHEDULE_BLOCKING_STATUSES } from "../../../packages/core/src/gig.ts";
import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";

type ResultCode =
  | "applied"
  | "unauthorized"
  | "not_found"
  | "own_gig"
  | "not_available"
  | "refused_before"
  | "blocked"
  | "schedule_conflict"
  | "invalid_request";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(code: ResultCode, status: number): Response {
  return new Response(JSON.stringify({ code }), {
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

  let gigId: unknown;
  try {
    ({ gigId } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string") return respond("invalid_request", 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const workerId = userData.user.id;

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, status, starts_at, ends_at")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id === workerId) return respond("own_gig", 409);
  if (gig.status !== "open") return respond("not_available", 409);
  // Already started: the expiration job (D-022) will collect it — the
  // search hides it, but a stale deep link could still land here.
  if (new Date(gig.starts_at) <= new Date()) return respond("not_available", 409);

  const { data: refusal } = await admin
    .from("gig_refusals")
    .select("gig_id")
    .eq("gig_id", gigId)
    .eq("worker_id", workerId)
    .maybeSingle();
  if (refusal) return respond("refused_before", 403);

  const { data: blocks } = await admin
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${workerId},blocked_id.eq.${gig.poster_id}),` +
        `and(blocker_id.eq.${gig.poster_id},blocked_id.eq.${workerId})`,
    )
    .limit(1);
  if (blocks && blocks.length > 0) return respond("blocked", 403);

  const { data: commitments } = await admin
    .from("gigs")
    .select("starts_at, ends_at")
    .eq("worker_id", workerId)
    .in("status", [...SCHEDULE_BLOCKING_STATUSES]);
  const candidate = { startsAt: gig.starts_at, endsAt: gig.ends_at };
  const committed = (commitments ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
  if (hasScheduleConflict(candidate, committed)) {
    return respond("schedule_conflict", 409);
  }

  // Atomic lock: only succeeds while the gig is still open.
  const { data: locked } = await admin
    .from("gigs")
    .update({ status: "pending_approval", worker_id: workerId })
    .eq("id", gigId)
    .eq("status", "open")
    .select("id");
  if (!locked || locked.length === 0) return respond("not_available", 409);

  return respond("applied", 200);
});
