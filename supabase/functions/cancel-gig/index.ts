// Edge Function: cancel-gig
// The poster cancels a service AFTER approving the candidate (docs/02 §3,
// D-018/D-020): accepted/in_progress → cancelled_by_poster. The FINE is
// 25% of the worker amount (min R$ 10); the poster receives ONE refund
// with the fine already deducted (worker amount − fine; the creation fee
// stays with the platform), and the harmed worker is paid 80% of the fine
// directly. The 80/20 split is internal — the UI presents the whole fine
// as compensation for the worker (D-019).
//
// Deleting BEFORE approval (no fine) is delete-gig, not this function.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { posterCancellationIncursFine, type GigStatus } from "../../../packages/core/src/gig.ts";
import { computeCancellationFine } from "../../../packages/core/src/pricing.ts";

type ResultCode =
  | "cancelled"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_cancellable"
  | "state_changed"
  | "invalid_request";

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
  const userId = userData.user.id;

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, worker_id, status, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (!posterCancellationIncursFine(gig.status as GigStatus) || !gig.worker_id) {
    return respond("not_cancellable", 409);
  }

  // Atomic: only the caller that wins this conditional UPDATE moves money,
  // so the refund/fine can never be applied twice. The worker id is kept
  // for history.
  const { data: cancelled } = await admin
    .from("gigs")
    .update({ status: "cancelled_by_poster" })
    .eq("id", gig.id)
    .in("status", ["accepted", "in_progress"])
    .select("id");
  if (!cancelled || cancelled.length === 0) return respond("state_changed", 409);

  // ONE movement per person (D-020): the poster gets a single refund with
  // the fine already deducted (net − fine; the creation fee stays with the
  // platform), and the harmed worker is paid his share directly. The
  // platform keeps the remainder of the fine implicitly. On a
  // minimum-price gig the poster refund is zero — no entry is written.
  const fine = computeCancellationFine(gig.price_cents);
  const entries = [
    { user_id: gig.worker_id, gig_id: gig.id, type: "fine", amount_cents: fine.workerShareCents },
  ];
  if (fine.posterRefundCents > 0) {
    entries.unshift({
      user_id: userId,
      gig_id: gig.id,
      type: "refund",
      amount_cents: fine.posterRefundCents,
    });
  }
  await admin.from("ledger_entries").insert(entries);

  return respond("cancelled", 200, {
    fineCents: fine.fineCents,
    posterRefundCents: fine.posterRefundCents,
  });
});
