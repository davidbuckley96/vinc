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
