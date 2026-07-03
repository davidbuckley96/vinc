/**
 * Platform pricing (docs/02 §5.1 — D-013). The poster pays the GROSS value
 * at gig creation: a non-refundable service fee stays with the platform and
 * the NET amount is escrowed for the worker, who always sees and receives
 * the net. The rate below is an EXAMPLE pending the final decision
 * (docs/07 #2).
 */

export const PLATFORM_FEE_RATE = 0.1;

export interface GigPricing {
  grossCents: number;
  feeCents: number;
  netCents: number;
}

export function computeGigPricing(grossCents: number): GigPricing {
  const feeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
  return { grossCents, feeCents, netCents: grossCents - feeCents };
}
