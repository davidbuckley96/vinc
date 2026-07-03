import { describe, expect, it } from "vitest";

import { computeGigPricing } from "./pricing";

describe("computeGigPricing", () => {
  it("adds the fee on top of the worker amount (example rate 10%)", () => {
    expect(computeGigPricing(10000)).toEqual({
      netCents: 10000,
      feeCents: 1000,
      totalCents: 11000,
    });
  });

  it("keeps whole cents and an exact sum", () => {
    const pricing = computeGigPricing(9999);
    expect(Number.isInteger(pricing.feeCents)).toBe(true);
    expect(pricing.netCents + pricing.feeCents).toBe(pricing.totalCents);
  });
});
