// Edge Function: gig-lifecycle
// Drives the service through its lifecycle (docs/02 §4):
//   worker  start    accepted              -> in_progress
//   worker  complete in_progress           -> awaiting_confirmation
//   poster  confirm  awaiting_confirmation -> completed  (+ escrow release)
// Money only moves here (docs/03 principle 3): confirming releases the
// escrowed amount to the worker's wallet via an immutable ledger entry.
//
// Deploy: supabase functions deploy gig-lifecycle (or Management API)

import { createClient } from "npm:@supabase/supabase-js@2";

import {
  allowedLifecycleAction,
  type GigStatus,
} from "../../../packages/core/src/gig.ts";

type Action = "start" | "complete" | "confirm";

type ResultCode =
  | "done"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "invalid_action"
  | "state_changed"
  | "invalid_request";

const NEXT_STATUS: Record<Action, GigStatus> = {
  start: "in_progress",
  complete: "awaiting_confirmation",
  confirm: "completed",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  let gigId: unknown, action: unknown;
  try {
    ({ gigId, action } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string" || !["start", "complete", "confirm"].includes(action as string)) {
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
    .select("id, status, poster_id, worker_id, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);

  const role =
    gig.worker_id === userId ? "worker" : gig.poster_id === userId ? "poster" : null;
  if (!role) return respond("forbidden", 403);

  if (allowedLifecycleAction(gig.status as GigStatus, role) !== action) {
    return respond("invalid_action", 409, { status: gig.status });
  }

  // Atomic transition: only succeeds if the status hasn't changed meanwhile.
  const { data: updated } = await admin
    .from("gigs")
    .update({ status: NEXT_STATUS[action as Action] })
    .eq("id", gig.id)
    .eq("status", gig.status)
    .select("id");
  if (!updated || updated.length === 0) return respond("state_changed", 409);

  if (action === "confirm") {
    // Poster confirmed: release the escrowed amount to the worker.
    // Platform fee is an open question (docs/07 #2) — zero for now.
    await admin.from("ledger_entries").insert({
      user_id: gig.worker_id,
      gig_id: gig.id,
      type: "escrow_release",
      amount_cents: gig.price_cents,
    });
  }

  return respond("done", 200, { status: NEXT_STATUS[action as Action] });
});
