// PaymentProvider PORT (Fase 3.1/3.2 — D-035).
//
// The internal LEDGER stays the source of truth for every DECISION
// (holds, releases, refunds, fines); this port executes the matching
// EXTERNAL money movement at the payment provider. Implementations:
//   - 'simulated' (default): the MVP — no external money exists;
//     charges confirm instantly and everything else only logs.
//   - 'mercadopago' (3.2): Pix charge with QR + webhook confirmation.
//     Points at the real API or at the mp-mock test double via
//     MP_BASE_URL. Release/split (3.4) and payout (3.5) come next.
// Selected via the PAYMENT_PROVIDER function secret.
//
// NOTE for gateway mode (3.4): the pg_cron jobs that move money purely
// in SQL today (expire_due_gigs, auto_release_confirmations) must become
// scheduled Edge Functions so they can call this port too.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { createMercadoPagoProvider } from "./mercadopago.ts";

export interface ChargePosterInput {
  posterId: string;
  gigId: string;
  /** Escrowed amount the worker will receive. */
  netCents: number;
  /** Non-refundable platform fee (10% — D-035). */
  feeCents: number;
}

/** Instant (simulated) or pending a real Pix payment (gateway). */
export type ChargeResult =
  | { status: "confirmed" }
  | {
      status: "pending";
      chargeId: string;
      qrCode: string | null;
      qrCodeBase64: string | null;
    };

export interface ReleaseToWorkerInput {
  workerId: string;
  gigId: string;
  amountCents: number;
}

export interface RefundPosterInput {
  posterId: string;
  gigId: string;
  amountCents: number;
  /** Refund THIS charge (stale-choice refunds — D-040); defaults to the
   * gig's confirmed charge. */
  chargeId?: string;
}

/** Fine share paid to the harmed party (D-018/D-027). */
export interface TransferCompensationInput {
  userId: string;
  gigId: string;
  amountCents: number;
}

export interface PayoutWithdrawalInput {
  userId: string;
  amountCents: number;
}

export interface PaymentProvider {
  readonly name: string;
  /** Poster pays net + fee at gig creation (Pix charge in gateway mode). */
  chargePoster(input: ChargePosterInput): Promise<ChargeResult>;
  /** Escrowed net (or a dispute remainder) goes to the worker. */
  releaseToWorker(input: ReleaseToWorkerInput): Promise<void>;
  /** Held money returns to the poster (delete, cancel, dispute, expiry). */
  refundPoster(input: RefundPosterInput): Promise<void>;
  /** Compensation to a harmed party, from the held amount/platform. */
  transferCompensation(input: TransferCompensationInput): Promise<void>;
  /** Worker's available balance leaves to their bank account (Pix out). */
  payoutWithdrawal(input: PayoutWithdrawalInput): Promise<void>;
}

const simulated: PaymentProvider = {
  name: "simulated",
  // deno-lint-ignore require-await
  async chargePoster(input) {
    console.log(`[payments:simulated] chargePoster ${JSON.stringify(input)}`);
    return { status: "confirmed" };
  },
  // deno-lint-ignore require-await
  async releaseToWorker(input) {
    console.log(`[payments:simulated] releaseToWorker ${JSON.stringify(input)}`);
  },
  // deno-lint-ignore require-await
  async refundPoster(input) {
    console.log(`[payments:simulated] refundPoster ${JSON.stringify(input)}`);
  },
  // deno-lint-ignore require-await
  async transferCompensation(input) {
    console.log(`[payments:simulated] transferCompensation ${JSON.stringify(input)}`);
  },
  // deno-lint-ignore require-await
  async payoutWithdrawal(input) {
    console.log(`[payments:simulated] payoutWithdrawal ${JSON.stringify(input)}`);
  },
};

/** Selected by the PAYMENT_PROVIDER env (function secrets); defaults to
 * the simulation so nothing changes until an adapter is enabled. */
export function getPaymentProvider(admin: SupabaseClient): PaymentProvider {
  const which = Deno.env.get("PAYMENT_PROVIDER") ?? "simulated";
  if (which === "simulated") return simulated;
  if (which === "mercadopago") return createMercadoPagoProvider(admin);
  throw new Error(`unknown payment provider: ${which}`);
}
