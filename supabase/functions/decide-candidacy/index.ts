// Edge Function: decide-candidacy
// The poster CHOOSES one candidate or REFUSES one, by candidacy id
// (docs/02 §3, D-024). Since D-040 the CHOICE is where the money enters:
//   - refuse: permanent for THIS gig only; the gig stays open.
//   - choose: re-checks the candidate's schedule, then moves the gig to
//     pending_payment holding the candidacy and charges worker amount +
//     fee via the PaymentProvider. Simulated provider confirms instantly
//     (choice finalizes here); the gateway returns a Pix QR and the
//     payment-webhook finalizes when it lands. The candidate is only
//     notified AFTER the payment confirms — an unpaid choice reopens in
//     30 minutes and nobody ever knew.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { ACTIVE_WORKER_STATUSES } from "../../../packages/core/src/gig.ts";
import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";
import { finalizeChosenCandidacy } from "../_shared/choice.ts";
import { withObservability } from "../_shared/observability.ts";
import { getPaymentProvider } from "../_shared/payment-provider.ts";

type ResultCode =
  | "chosen"
  | "chosen_pending_payment"
  | "refused"
  | "candidate_unavailable"
  | "payment_failed"
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

function respond(code: ResultCode, status: number, extra: object = {}): Response {
  return new Response(JSON.stringify({ code, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(withObservability("decide-candidacy", async (request) => {
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
    .select("id, poster_id, status, starts_at, ends_at, price_cents, fee_cents")
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

  // Atomic: only one choice can hold the gig for payment (D-040). The
  // candidacy stays pending — the candidate learns nothing until the
  // payment confirms.
  const { data: held } = await admin
    .from("gigs")
    .update({
      status: "pending_payment",
      pending_candidacy_id: candidacy.id,
      choice_pending_since: new Date().toISOString(),
    })
    .eq("id", gig.id)
    .eq("status", "open")
    .select("id");
  if (!held || held.length === 0) return respond("state_changed", 409);

  let charge;
  try {
    charge = await getPaymentProvider(admin).chargePoster({
      posterId: userId,
      gigId: gig.id,
      netCents: gig.price_cents,
      feeCents: gig.fee_cents,
    });
  } catch (error) {
    console.error(`choice charge failed for gig ${gig.id}:`, error);
    await admin
      .from("gigs")
      .update({ status: "open", pending_candidacy_id: null, choice_pending_since: null })
      .eq("id", gig.id)
      .eq("status", "pending_payment");
    return respond("payment_failed", 502);
  }

  if (charge.status === "confirmed") {
    // Simulated provider (default until the CNPJ): finalize right away.
    const result = await finalizeChosenCandidacy(admin, gig.id);
    return result === "finalized"
      ? respond("chosen", 200)
      : respond("state_changed", 409);
  }

  return respond("chosen_pending_payment", 200, {
    gigId: gig.id,
    payment: {
      chargeId: charge.chargeId,
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      totalCents: gig.price_cents + gig.fee_cents,
    },
  });
}));
