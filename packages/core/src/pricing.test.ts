import { describe, expect, it } from "vitest";

import { computeGigPricing } from "./pricing";

describe("computeGigPricing", () => {
  it("splits gross into fee and net (example rate 10%)", () => {
    expect(computeGigPricing(10000)).toEqual({
      grossCents: 10000,
      feeCents: 1000,
      netCents: 9000,
    });
  });

  it("rounds the fee to whole cents and keeps the sum exact", () => {
    const pricing = computeGigPricing(9999);
    expect(pricing.feeCents + pricing.netCents).toBe(9999);
    expect(Number.isInteger(pricing.feeCents)).toBe(true);
  });
});
