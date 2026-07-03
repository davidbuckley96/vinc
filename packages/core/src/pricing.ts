/**
 * Platform pricing (docs/02 §5.1 — D-013/D-014). The poster chooses the
 * exact amount the WORKER receives (net) and pays net + service fee at gig
 * creation; the fee is non-refundable and stays with the platform. The
 * rate below is an EXAMPLE pending the final decision (docs/07 #2).
 */

export const PLATFORM_FEE_RATE = 0.1;

export interface GigPricing {
  /** What the worker receives — the value the poster typed. */
  netCents: number;
  /** Platform service fee, added on top. */
  feeCents: number;
  /** What the poster pays at creation: net + fee. */
  totalCents: number;
}

export function computeGigPricing(netCents: number): GigPricing {
  const feeCents = Math.round(netCents * PLATFORM_FEE_RATE);
  return { netCents, feeCents, totalCents: netCents + feeCents };
}

/**
 * Poster cancellation fine (docs/02 §3, D-018): cancelling after approving
 * a candidate costs 25% of the worker amount (min R$ 10), charged on top
 * of the (refunded) worker amount. 80% compensates the harmed worker, 20%
 * stays with the platform.
 */
export const CANCELLATION_FINE_RATE = 0.25;
export const CANCELLATION_FINE_FLOOR_CENTS = 1000;
export const CANCELLATION_FINE_WORKER_SHARE = 0.8;

export interface CancellationFine {
  /** Total charged from the poster. */
  fineCents: number;
  /** Portion paid to the harmed worker (80%). */
  workerShareCents: number;
  /** Portion kept by the platform (20%). */
  platformShareCents: number;
  /**
   * What the poster actually gets back — a SINGLE refund with the fine
   * already deducted (net − fine), never two separate movements (D-020).
   * Zero when the gig pays the R$ 10 minimum (fine floor == price floor).
   */
  posterRefundCents: number;
}

export function computeCancellationFine(netCents: number): CancellationFine {
  const fineCents = Math.max(
    Math.round(netCents * CANCELLATION_FINE_RATE),
    CANCELLATION_FINE_FLOOR_CENTS,
  );
  const workerShareCents = Math.round(fineCents * CANCELLATION_FINE_WORKER_SHARE);
  return {
    fineCents,
    workerShareCents,
    platformShareCents: fineCents - workerShareCents,
    posterRefundCents: netCents - fineCents,
  };
}
