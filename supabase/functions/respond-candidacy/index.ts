// Edge Function: respond-candidacy
// The poster approves or refuses the pending candidate (docs/02 §3, D-012):
//   - approve: re-checks the candidate's schedule (they may have taken
//     another job while waiting; conflict → auto-refuse), then
//     pending_approval → accepted atomically and the escrow is held
//   - refuse: pending_approval → open (gig relists), and the candidate is
//     permanently refused for THIS gig only (gig_refusals). No fine.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { ACTIVE_WORKER_STATUSES } from "../../../packages/core/src/gig.ts";
import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";

type ResultCode =
  | "approved"
  | "refused"
  | "candidate_unavailable"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "invalid_action"
  | "state_changed"
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

  let gigId: unknown, action: unknown;
  try {
    ({ gigId, action } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string" || !["approve", "refuse"].includes(action as string)) {
    return respond("invalid_request", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const userId = userData.user.id;

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, worker_id, status, starts_at, ends_at, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (gig.status !== "pending_approval" || !gig.worker_id) {
    return respond("invalid_action", 409);
  }
  const candidateId = gig.worker_id;

  async function refuseCandidate(): Promise<boolean> {
    const { data: reopened } = await admin
      .from("gigs")
      .update({ status: "open", worker_id: null })
      .eq("id", gig!.id)
      .eq("status", "pending_approval")
      .select("id");
    if (!reopened || reopened.length === 0) return false;
    await admin
      .from("gig_refusals")
      .upsert({ gig_id: gig!.id, worker_id: candidateId });
    return true;
  }

  if (action === "refuse") {
    return (await refuseCandidate()) ? respond("refused", 200) : respond("state_changed", 409);
  }

  // approve: the candidate may have gotten busy while waiting — re-check.
  const { data: commitments } = await admin
    .from("gigs")
    .select("starts_at, ends_at")
    .eq("worker_id", candidateId)
    .in("status", [...ACTIVE_WORKER_STATUSES]);
  const range = { startsAt: gig.starts_at, endsAt: gig.ends_at };
  const committed = (commitments ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
  if (hasScheduleConflict(range, committed)) {
    await refuseCandidate();
    return respond("candidate_unavailable", 409);
  }

  const { data: approved } = await admin
    .from("gigs")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", gig.id)
    .eq("status", "pending_approval")
    .select("id");
  if (!approved || approved.length === 0) return respond("state_changed", 409);

  // No money moves here: the escrow was already held at gig CREATION
  // (create-gig, D-013) and is released to the worker on confirmation.
  return respond("approved", 200);
});
