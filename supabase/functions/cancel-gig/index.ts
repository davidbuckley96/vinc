// Edge Function: cancel-gig
// EITHER party cancels a service after the choice (docs/02 §3):
//
// POSTER cancels (D-018/D-020): accepted/in_progress →
// cancelled_by_poster. Fine of 25% of the worker amount (min R$ 10); the
// poster gets ONE refund with the fine already deducted; the harmed
// worker is paid 80% of the fine directly.
//
// WORKER cancels (D-027, mirror rule): accepted/in_progress →
// cancelled_by_worker. Same fine (25%, min R$ 10) charged FROM the
// worker's wallet (may go negative in the MVP simulation; the real card
// charge arrives with the Fase 3 gateway); the harmed poster gets the
// FULL worker amount back plus 80% of the fine.
//
// The 80/20 split is internal — the UI presents the whole fine as
// compensation for the harmed party (D-019).
//
// Deleting BEFORE approval (no fine) is delete-gig, not this function.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { posterCancellationIncursFine, type GigStatus } from "../../../packages/core/src/gig.ts";
import { computeCancellationFine } from "../../../packages/core/src/pricing.ts";
import { getPaymentProvider } from "../_shared/payment-provider.ts";

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
  if (gig.poster_id !== userId && gig.worker_id !== userId) {
    return respond("forbidden", 403);
  }
  const role = gig.poster_id === userId ? "poster" : "worker";
  if (!posterCancellationIncursFine(gig.status as GigStatus) || !gig.worker_id) {
    return respond("not_cancellable", 409);
  }

  // Atomic: only the caller that wins this conditional UPDATE moves money,
  // so the refund/fine can never be applied twice. The worker id is kept
  // for history.
  const { data: cancelled } = await admin
    .from("gigs")
    .update({ status: role === "poster" ? "cancelled_by_poster" : "cancelled_by_worker" })
    .eq("id", gig.id)
    .in("status", ["accepted", "in_progress"])
    .select("id");
  if (!cancelled || cancelled.length === 0) return respond("state_changed", 409);

  const fine = computeCancellationFine(gig.price_cents);

  if (role === "poster") {
    // ONE movement per person (D-020): the poster gets a single refund
    // with the fine already deducted (the creation fee stays with the
    // platform), and the harmed worker is paid his share directly. On a
    // minimum-price gig the poster refund is zero — no entry is written.
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
    const provider = getPaymentProvider();
    if (fine.posterRefundCents > 0) {
      await provider.refundPoster({
        posterId: userId,
        gigId: gig.id,
        amountCents: fine.posterRefundCents,
      });
    }
    await provider.transferCompensation({
      userId: gig.worker_id,
      gigId: gig.id,
      amountCents: fine.workerShareCents,
    });
    return respond("cancelled", 200, {
      role,
      fineCents: fine.fineCents,
      posterRefundCents: fine.posterRefundCents,
    });
  }

  // WORKER cancels (D-027): the innocent poster gets the full worker
  // amount back plus the harmed share of the fine; the worker pays the
  // fine from his wallet (negative balance allowed in the MVP simulation;
  // real card charge in Fase 3 when the balance doesn't cover it).
  await admin.from("ledger_entries").insert([
    { user_id: gig.poster_id, gig_id: gig.id, type: "refund", amount_cents: gig.price_cents },
    { user_id: gig.poster_id, gig_id: gig.id, type: "fine", amount_cents: fine.workerShareCents },
    { user_id: userId, gig_id: gig.id, type: "fine", amount_cents: -fine.fineCents },
  ]);
  // The worker's own fine (negative entry) has no external movement yet:
  // charging their card when the balance doesn't cover it is block 3.8.
  const provider = getPaymentProvider();
  await provider.refundPoster({
    posterId: gig.poster_id,
    gigId: gig.id,
    amountCents: gig.price_cents,
  });
  await provider.transferCompensation({
    userId: gig.poster_id,
    gigId: gig.id,
    amountCents: fine.workerShareCents,
  });
  return respond("cancelled", 200, { role, fineCents: fine.fineCents });
});
