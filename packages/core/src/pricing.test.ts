import { describe, expect, it } from "vitest";

import { computeCancellationFine, computeGigPricing } from "./pricing";

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

describe("computeCancellationFine (D-018)", () => {
  it("charges 25% of the worker amount, split 80/20", () => {
    expect(computeCancellationFine(10000)).toEqual({
      fineCents: 2500,
      workerShareCents: 2000,
      platformShareCents: 500,
    });
  });

  it("applies the R$ 10 floor on cheap gigs", () => {
    expect(computeCancellationFine(2000)).toEqual({
      fineCents: 1000,
      workerShareCents: 800,
      platformShareCents: 200,
    });
  });

  it("splits into whole cents that add up exactly", () => {
    const fine = computeCancellationFine(9999);
    expect(Number.isInteger(fine.workerShareCents)).toBe(true);
    expect(fine.workerShareCents + fine.platformShareCents).toBe(fine.fineCents);
  });
});
