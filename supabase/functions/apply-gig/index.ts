// Edge Function: apply-gig
// A worker applies to an OPEN gig (docs/02 §3, D-024): the gig stays open
// and keeps collecting candidates; the poster later chooses one. A pending
// candidacy does NOT block the worker's schedule — only being chosen does
// (decide-candidacy re-checks the conflict).
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { ACTIVE_WORKER_STATUSES } from "../../../packages/core/src/gig.ts";
import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";

type ResultCode =
  | "applied"
  | "already_applied"
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
  // Already started: the expiration job (D-022) will collect it.
  if (new Date(gig.starts_at) <= new Date()) return respond("not_available", 409);

  const { data: existing } = await admin
    .from("gig_candidacies")
    .select("status")
    .eq("gig_id", gigId)
    .eq("worker_id", workerId)
    .maybeSingle();
  if (existing) {
    return existing.status === "refused"
      ? respond("refused_before", 403)
      : respond("already_applied", 409);
  }

  const { data: blocks } = await admin
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${workerId},blocked_id.eq.${gig.poster_id}),` +
        `and(blocker_id.eq.${gig.poster_id},blocked_id.eq.${workerId})`,
    )
    .limit(1);
  if (blocks && blocks.length > 0) return respond("blocked", 403);

  // Real commitments still conflict; other pending candidacies don't.
  const { data: commitments } = await admin
    .from("gigs")
    .select("starts_at, ends_at")
    .eq("worker_id", workerId)
    .in("status", [...ACTIVE_WORKER_STATUSES]);
  const range = { startsAt: gig.starts_at, endsAt: gig.ends_at };
  const committed = (commitments ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
  if (hasScheduleConflict(range, committed)) return respond("schedule_conflict", 409);

  // The unique (gig_id, worker_id) constraint settles races.
  const { error: insertError } = await admin
    .from("gig_candidacies")
    .insert({ gig_id: gig.id, worker_id: workerId });
  if (insertError) return respond("already_applied", 409);

  return respond("applied", 200);
});
