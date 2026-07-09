// Edge Function: payment-webhook (Fase 3.2 — D-035; reshaped by D-040)
// Receives the provider's payment notification and FINALIZES the choice:
// the gig holding a paid candidacy becomes accepted (worker set, ledger
// fee + escrow written, check-in code, "chosen" notification — all only
// now, after the money landed).
//
// If the choice is gone (expired after 30 min, candidate withdrew or got
// busy) the payment is refunded in full — the service didn't happen, so
// the platform keeps nothing (D-040). The refund is claimed atomically
// on the charge row, so replayed webhooks can't double-refund.
//
// Security: the notification body is NEVER trusted — only the payment id
// is read from it; the payment status and gig id come from re-fetching
// the payment at the provider with our own credentials. Deployed with
// verify_jwt=false — the provider cannot send Supabase JWTs.

import { createClient } from "npm:@supabase/supabase-js@2";

import { finalizeChosenCandidacy } from "../_shared/choice.ts";
import { fetchPaymentStatus } from "../_shared/mercadopago.ts";
import { getPaymentProvider } from "../_shared/payment-provider.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(extra: object = {}): Response {
  return new Response(JSON.stringify({ ok: true, ...extra }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Mercado Pago sends { action, data: { id } } and/or ?id=&topic= params.
  let chargeId: string | null = null;
  try {
    const body = await request.json();
    chargeId = body?.data?.id ? String(body.data.id) : null;
  } catch {
    // fall through to query params
  }
  if (!chargeId) {
    const url = new URL(request.url);
    chargeId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  }
  if (!chargeId) return ok({ ignored: "no charge id" });

  let payment;
  try {
    payment = await fetchPaymentStatus(chargeId);
  } catch (error) {
    console.error(`webhook: could not verify payment ${chargeId}:`, error);
    // 200 so the provider stops retrying a permanently-broken id; real
    // pending payments will notify again on the next status change.
    return ok({ ignored: "verification failed" });
  }
  if (payment.status !== "approved" || !payment.gigId) {
    return ok({ ignored: `status ${payment.status}` });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const result = await finalizeChosenCandidacy(admin, payment.gigId);
  if (result === "finalized") return ok({ accepted: payment.gigId });

  // Choice gone (or replayed webhook): refund once — the atomic pending →
  // refunded claim on the charge row settles races and replays.
  const { data: refundable } = await admin
    .from("gig_payments")
    .update({ status: "refunded" })
    .eq("charge_id", chargeId)
    .eq("status", "pending")
    .select("gig_id, amount_total_cents");
  if (!refundable || refundable.length === 0) return ok({ ignored: "already settled" });

  const { data: gig } = await admin
    .from("gigs")
    .select("poster_id")
    .eq("id", payment.gigId)
    .maybeSingle();
  try {
    await getPaymentProvider(admin).refundPoster({
      posterId: gig?.poster_id ?? "",
      gigId: payment.gigId,
      amountCents: refundable[0].amount_total_cents,
      chargeId,
    });
  } catch (error) {
    // The row is already marked refunded — surface loudly for the admin.
    console.error(`webhook: refund of stale charge ${chargeId} FAILED:`, error);
  }
  return ok({ refunded: payment.gigId });
});
