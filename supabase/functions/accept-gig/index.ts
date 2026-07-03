// Edge Function: accept-gig
// The critical marketplace action (docs/02 §3): a worker claims an open gig.
// Runs with the service role because clients must never decide acceptance
// (docs/03 principle 3). Guarantees:
//   - only authenticated users, never the poster themselves
//   - schedule-conflict check against the worker's active commitments,
//     using the same pure rule as the app (packages/core/src/schedule.ts)
//   - atomic claim: UPDATE ... WHERE status = 'open' — two workers can
//     never take the same gig (the second update matches zero rows)
//
// Deploy: supabase functions deploy accept-gig

import { createClient } from "npm:@supabase/supabase-js@2";

import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";

type ResultCode =
  | "accepted"
  | "unauthorized"
  | "not_found"
  | "own_gig"
  | "already_taken"
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

  const authHeader = request.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "");
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
    .select("id, poster_id, status, starts_at, ends_at, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id === workerId) return respond("own_gig", 409);
  if (gig.status !== "open") return respond("already_taken", 409);

  // Schedule conflict against the worker's active commitments as a worker.
  // Gigs they posted don't block them (they hire, they don't attend) — see
  // docs/02 §3; revisit if the product decides otherwise.
  const { data: commitments } = await admin
    .from("gigs")
    .select("starts_at, ends_at")
    .eq("worker_id", workerId)
    .in("status", ["accepted", "in_progress"]);

  const candidate = { startsAt: gig.starts_at, endsAt: gig.ends_at };
  const committed = (commitments ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
  if (hasScheduleConflict(candidate, committed)) {
    return respond("schedule_conflict", 409);
  }

  // Atomic claim: only succeeds if the gig is still open.
  const { data: claimed } = await admin
    .from("gigs")
    .update({
      status: "accepted",
      worker_id: workerId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", gigId)
    .eq("status", "open")
    .select("id");

  if (!claimed || claimed.length === 0) return respond("already_taken", 409);

  // Escrow hold (docs/02 §5): the gig price leaves the poster's simulated
  // wallet the moment the gig is claimed. Released to the worker on
  // confirmation (gig-lifecycle), refunded on legitimate cancellation.
  await admin.from("ledger_entries").insert({
    user_id: gig.poster_id,
    gig_id: gig.id,
    type: "escrow_hold",
    amount_cents: -gig.price_cents,
  });

  return respond("accepted", 200);
});
