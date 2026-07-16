import { describe, expect, it } from "vitest";

import {
  applyDebtToPayout,
  computeCancellationFine,
  computeGigPricing,
  computeNoShowRefund,
} from "./pricing";

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

describe("computeCancellationFine (D-018/D-020)", () => {
  it("charges 25% of the worker amount, split 80/20, refunded in one move", () => {
    expect(computeCancellationFine(10000)).toEqual({
      fineCents: 2500,
      workerShareCents: 2000,
      platformShareCents: 500,
      posterRefundCents: 7500,
    });
  });

  it("applies the R$ 10 floor on cheap gigs", () => {
    expect(computeCancellationFine(2000)).toEqual({
      fineCents: 1000,
      workerShareCents: 800,
      platformShareCents: 200,
      posterRefundCents: 1000,
    });
  });

  it("refunds nothing on a minimum-price gig (floor == minimum)", () => {
    expect(computeCancellationFine(1000).posterRefundCents).toBe(0);
  });

  it("splits into whole cents that add up exactly", () => {
    const fine = computeCancellationFine(9999);
    expect(Number.isInteger(fine.workerShareCents)).toBe(true);
    expect(fine.workerShareCents + fine.platformShareCents).toBe(fine.fineCents);
    expect(fine.posterRefundCents + fine.fineCents).toBe(9999);
  });
});

describe("computeNoShowRefund (D-071)", () => {
  it("refunds net + fee in full and makes the fee the worker's debt", () => {
    expect(computeNoShowRefund(10000)).toEqual({
      posterRefundCents: 11000, // 10000 net + 1000 fee
      workerDebtCents: 1000, // the refunded 10% fee
    });
  });

  it("scales with the gig price", () => {
    expect(computeNoShowRefund(5000)).toEqual({
      posterRefundCents: 5500,
      workerDebtCents: 500,
    });
  });
});

describe("applyDebtToPayout (D-071)", () => {
  it("seizes the whole debt when it fits under half the payout", () => {
    // owes 1000, payout 10000 → cap 5000, takes 1000, worker keeps 9000
    expect(applyDebtToPayout(10000, 1000)).toEqual({
      deductedCents: 1000,
      workerGetsCents: 9000,
      remainingDebtCents: 0,
    });
  });

  it("never takes more than half — worker always keeps at least 50%", () => {
    // owes 8000, payout 10000 → cap 5000, takes 5000, 3000 stays owed
    expect(applyDebtToPayout(10000, 8000)).toEqual({
      deductedCents: 5000,
      workerGetsCents: 5000,
      remainingDebtCents: 3000,
    });
  });

  it("floors the 50% cap to whole cents", () => {
    // payout 999 → cap floor(499.5)=499
    expect(applyDebtToPayout(999, 1000)).toEqual({
      deductedCents: 499,
      workerGetsCents: 500,
      remainingDebtCents: 501,
    });
  });

  it("takes nothing when there is no debt", () => {
    expect(applyDebtToPayout(10000, 0)).toEqual({
      deductedCents: 0,
      workerGetsCents: 10000,
      remainingDebtCents: 0,
    });
  });
})
