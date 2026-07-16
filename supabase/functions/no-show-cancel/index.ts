// Edge Function: no-show-cancel (D-071)
// The POSTER free-cancels because the chosen worker never showed up to start
// the service. Eligible only when the gig is `accepted` (a candidate was
// chosen and PAID), the worker never started (`started_at` null) and the
// 30-min tolerance past the scheduled start has elapsed (canDeclareNoShow).
//
// Effects:
//   - status → cancelled_by_worker, worker_no_show = true (the fault is the
//     worker's; the flag distinguishes a furo from a normal worker cancel).
//   - the poster is refunded IN FULL: worker amount + the 10% fee (normally
//     kept, D-014) — a single `refund` ledger entry + provider.refundPoster.
//   - the refunded fee becomes a `worker_debts` row owed by the no-show
//     worker, collected later from their earnings (scheduled-money-jobs).
//
// The report is NOT automatic: this only refunds + records the debt. The
// worker contests from the gig in their history, which opens a support
// dispute (D-071).
//
// Deploy: Management API multipart (verify_jwt=true).

import { createClient } from "npm:@supabase/supabase-js@2";

import { canDeclareNoShow, type GigStatus } from "../../../packages/core/src/gig.ts";
import { computeNoShowRefund } from "../../../packages/core/src/pricing.ts";
import { getPaymentProvider } from "../_shared/payment-provider.ts";

type ResultCode =
  | "cancelled"
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
    .select("id, poster_id, worker_id, status, price_cents, starts_at, started_at")
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

  // Atomic: only the caller that wins this conditional UPDATE moves money, so
  // the refund + debt can never be applied twice. Guard on the exact eligible
  // state (accepted + not started).
  const { data: cancelled } = await admin
    .from("gigs")
    .update({ status: "cancelled_by_worker", worker_no_show: true })
    .eq("id", gig.id)
    .eq("status", "accepted")
    .is("started_at", null)
    .select("id");
  if (!cancelled || cancelled.length === 0) return respond("state_changed", 409);

  const { posterRefundCents, workerDebtCents } = computeNoShowRefund(gig.price_cents);

  // Full refund to the poster (net + fee) — one movement (D-020).
  await admin.from("ledger_entries").insert({
    user_id: gig.poster_id,
    gig_id: gig.id,
    type: "refund",
    amount_cents: posterRefundCents,
  });
  const provider = getPaymentProvider(admin);
  await provider.refundPoster({
    posterId: gig.poster_id,
    gigId: gig.id,
    amountCents: posterRefundCents,
  });

  // The refunded fee is now owed by the no-show worker. Idempotent on gig_id
  // (unique index) — a retry that lost the status race above never reaches
  // here, but the guard keeps double-insert impossible either way.
  await admin.from("worker_debts").insert({
    worker_id: gig.worker_id,
    gig_id: gig.id,
    amount_cents: workerDebtCents,
    remaining_cents: workerDebtCents,
    status: "open",
  });

  // D-071 (dúvida 24): furo repetido também penaliza a reputação — registra um
  // evento de integridade; a reincidência (2º furo em 30 dias) suspende (C).
  await admin.rpc("record_offense", {
    p_user: gig.worker_id,
    p_type: "no_show",
    p_gig: gig.id,
  });

  return respond("cancelled", 200, {
    posterRefundCents,
    workerDebtCents,
  });
});
