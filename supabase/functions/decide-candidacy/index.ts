// Edge Function: decide-candidacy
// The poster CHOOSES one candidate or REFUSES one, by candidacy id
// (docs/02 §3, D-024):
//   - choose: re-checks the candidate's schedule (they may have been
//     chosen elsewhere while waiting; conflict → auto-refuse), then
//     open → accepted atomically; other pending candidacies of the gig
//     become not_chosen (free to apply elsewhere, no penalty).
//   - refuse: permanent for THIS gig only; the gig stays open.
// No money moves here — the escrow was held at creation (D-013).
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { ACTIVE_WORKER_STATUSES } from "../../../packages/core/src/gig.ts";
import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";

type ResultCode =
  | "chosen"
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

  let candidacyId: unknown, action: unknown;
  try {
    ({ candidacyId, action } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof candidacyId !== "string" || !["choose", "refuse"].includes(action as string)) {
    return respond("invalid_request", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const userId = userData.user.id;

  const { data: candidacy } = await admin
    .from("gig_candidacies")
    .select("id, gig_id, worker_id, status")
    .eq("id", candidacyId)
    .maybeSingle();
  if (!candidacy) return respond("not_found", 404);

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, status, starts_at, ends_at")
    .eq("id", candidacy.gig_id)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (candidacy.status !== "pending" || gig.status !== "open") {
    return respond("invalid_action", 409);
  }

  if (action === "refuse") {
    const { data: refused } = await admin
      .from("gig_candidacies")
      .update({ status: "refused" })
      .eq("id", candidacy.id)
      .eq("status", "pending")
      .select("id");
    return refused && refused.length > 0
      ? respond("refused", 200)
      : respond("state_changed", 409);
  }

  // choose: the candidate may have been chosen elsewhere while waiting.
  const { data: commitments } = await admin
    .from("gigs")
    .select("starts_at, ends_at")
    .eq("worker_id", candidacy.worker_id)
    .in("status", [...ACTIVE_WORKER_STATUSES]);
  const range = { startsAt: gig.starts_at, endsAt: gig.ends_at };
  const committed = (commitments ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
  if (hasScheduleConflict(range, committed)) {
    await admin
      .from("gig_candidacies")
      .update({ status: "refused" })
      .eq("id", candidacy.id)
      .eq("status", "pending");
    return respond("candidate_unavailable", 409);
  }

  // Atomic: only one choice can win the open → accepted transition.
  const { data: accepted } = await admin
    .from("gigs")
    .update({
      status: "accepted",
      worker_id: candidacy.worker_id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", gig.id)
    .eq("status", "open")
    .select("id");
  if (!accepted || accepted.length === 0) return respond("state_changed", 409);

  await admin
    .from("gig_candidacies")
    .update({ status: "chosen" })
    .eq("id", candidacy.id);
  // Check-in code (D-028): shown to the poster, typed by the worker on
  // arrival to start the service — proof of presence for disputes.
  const code = String(Math.floor(1000 + Math.random() * 9000));
  await admin.from("gig_checkin_codes").upsert({ gig_id: gig.id, code });
  await admin
    .from("gig_candidacies")
    .update({ status: "not_chosen" })
    .eq("gig_id", gig.id)
    .eq("status", "pending");

  return respond("chosen", 200);
});
