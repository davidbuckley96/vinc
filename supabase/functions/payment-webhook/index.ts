// Edge Function: payment-webhook (Fase 3.2 — D-035)
// Receives the provider's payment notification and PUBLISHES the gig:
// pending_payment → open + the upfront ledger entries (fee + escrow).
//
// Security: the notification body is NEVER trusted — only the payment id
// is read from it; the payment status and gig id come from re-fetching
// the payment at the provider with our own credentials. Publishing is
// idempotent (atomic conditional status update), so replayed webhooks
// can't double-write the ledger. Deployed with verify_jwt=false — the
// provider cannot send Supabase JWTs.

import { createClient } from "npm:@supabase/supabase-js@2";

import { fetchPaymentStatus } from "../_shared/mercadopago.ts";

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

  // Idempotent publish: only the first approval wins this transition and
  // therefore only one ledger write can ever happen.
  const { data: published } = await admin
    .from("gigs")
    .update({ status: "open" })
    .eq("id", payment.gigId)
    .eq("status", "pending_payment")
    .select("id, poster_id, price_cents, fee_cents");
  if (!published || published.length === 0) return ok({ ignored: "already published" });
  const gig = published[0];

  await admin.from("ledger_entries").insert([
    { user_id: gig.poster_id, gig_id: gig.id, type: "fee", amount_cents: -gig.fee_cents },
    { user_id: gig.poster_id, gig_id: gig.id, type: "escrow_hold", amount_cents: -gig.price_cents },
  ]);
  await admin
    .from("gig_payments")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("gig_id", gig.id)
    .eq("status", "pending");

  return ok({ published: gig.id });
});
