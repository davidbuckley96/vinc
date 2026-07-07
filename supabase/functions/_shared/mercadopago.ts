// Mercado Pago adapter (Fase 3.2 — D-035). Pix-only for now:
//   chargePoster  → POST /v1/payments (payment_method_id: pix) with a
//                   dynamic QR; the charge is confirmed asynchronously
//                   by the payment-webhook function.
//   refundPoster  → POST /v1/payments/{id}/refunds (partial or total,
//                   allowed while the money is still in custody).
//   release/split (3.4) and payout (3.5) land next.
//
// MP_BASE_URL points at the real API (default) or at the mp-mock test
// double — same surface, fake money — so the whole flow is provable
// before any real credentials/CNPJ exist (D-035). Webhooks are never
// trusted by themselves: the webhook re-fetches the payment here.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import type { ChargeResult, PaymentProvider } from "./payment-provider.ts";

function baseUrl(): string {
  return Deno.env.get("MP_BASE_URL") ?? "https://api.mercadopago.com";
}

function headers(idempotencyKey?: string): HeadersInit {
  return {
    Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN") ?? ""}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
  };
}

interface MpPayment {
  id: number | string;
  status: string;
  metadata?: { gig_id?: string };
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string };
  };
}

/** Used by payment-webhook: the notification body is never trusted —
 * the payment is re-fetched from the provider. */
export async function fetchPaymentStatus(
  chargeId: string,
): Promise<{ status: string; gigId: string | null }> {
  const response = await fetch(`${baseUrl()}/v1/payments/${chargeId}`, {
    headers: headers(),
  });
  if (!response.ok) throw new Error(`mp get payment failed: ${response.status}`);
  const payment = (await response.json()) as MpPayment;
  return { status: payment.status, gigId: payment.metadata?.gig_id ?? null };
}

export function createMercadoPagoProvider(admin: SupabaseClient): PaymentProvider {
  return {
    name: "mercadopago",

    async chargePoster({ posterId, gigId, netCents, feeCents }): Promise<ChargeResult> {
      const totalCents = netCents + feeCents;
      const response = await fetch(`${baseUrl()}/v1/payments`, {
        method: "POST",
        headers: headers(gigId),
        body: JSON.stringify({
          transaction_amount: totalCents / 100,
          payment_method_id: "pix",
          description: "Vinc — pagamento da vaga",
          metadata: { gig_id: gigId, poster_id: posterId },
          notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
          payer: { email: `poster-${posterId}@vinc.app` },
        }),
      });
      if (!response.ok) throw new Error(`mp charge failed: ${response.status}`);
      const payment = (await response.json()) as MpPayment;
      const transaction = payment.point_of_interaction?.transaction_data ?? {};

      await admin.from("gig_payments").insert({
        gig_id: gigId,
        provider: "mercadopago",
        charge_id: String(payment.id),
        amount_total_cents: totalCents,
        qr_code: transaction.qr_code ?? null,
        qr_code_base64: transaction.qr_code_base64 ?? null,
      });

      return {
        status: "pending",
        chargeId: String(payment.id),
        qrCode: transaction.qr_code ?? null,
        qrCodeBase64: transaction.qr_code_base64 ?? null,
      };
    },

    async refundPoster({ gigId, amountCents }) {
      const { data: charge } = await admin
        .from("gig_payments")
        .select("charge_id")
        .eq("gig_id", gigId)
        .eq("status", "confirmed")
        .maybeSingle();
      if (!charge) {
        // Gig paid before gateway mode (or simulated era): nothing external.
        console.warn(`[mercadopago] no confirmed charge for gig ${gigId}; refund skipped`);
        return;
      }
      const response = await fetch(
        `${baseUrl()}/v1/payments/${charge.charge_id}/refunds`,
        {
          method: "POST",
          headers: headers(`${gigId}-refund-${amountCents}`),
          body: JSON.stringify({ amount: amountCents / 100 }),
        },
      );
      if (!response.ok) throw new Error(`mp refund failed: ${response.status}`);
    },

    // deno-lint-ignore require-await
    async releaseToWorker(input) {
      console.warn(`[mercadopago] releaseToWorker TODO(3.4) ${JSON.stringify(input)}`);
    },
    // deno-lint-ignore require-await
    async transferCompensation(input) {
      console.warn(`[mercadopago] transferCompensation TODO(3.4) ${JSON.stringify(input)}`);
    },
    // deno-lint-ignore require-await
    async payoutWithdrawal(input) {
      console.warn(`[mercadopago] payoutWithdrawal TODO(3.5) ${JSON.stringify(input)}`);
    },
  };
}
