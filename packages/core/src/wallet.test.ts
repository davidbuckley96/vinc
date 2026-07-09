import { describe, expect, it } from "vitest";

import { deriveWalletBalances, isProcessing, releasesAt } from "./wallet";

const NOW = new Date("2026-07-10T12:00:00Z");

function entry(type: string, amountCents: number, createdAt: string) {
  return { type, amountCents, createdAt };
}

describe("releasesAt", () => {
  it("is exactly 7 days after the payment lands", () => {
    expect(releasesAt("2026-07-01T10:00:00.000Z")).toBe("2026-07-08T10:00:00.000Z");
  });
});

describe("isProcessing", () => {
  it("holds a fresh service payment and frees an old one", () => {
    expect(isProcessing(entry("escrow_release", 100, "2026-07-09T00:00:00Z"), NOW)).toBe(true);
    expect(isProcessing(entry("escrow_release", 100, "2026-07-01T00:00:00Z"), NOW)).toBe(false);
  });

  it("never holds other entry types", () => {
    expect(isProcessing(entry("fine", 2000, "2026-07-09T00:00:00Z"), NOW)).toBe(false);
    expect(isProcessing(entry("refund", 7500, "2026-07-09T00:00:00Z"), NOW)).toBe(false);
  });
});

describe("deriveWalletBalances", () => {
  it("splits held payments from the withdrawable balance", () => {
    const balances = deriveWalletBalances(
      [
        entry("escrow_release", 15000, "2026-07-01T00:00:00Z"), // released
        entry("escrow_release", 16000, "2026-07-09T00:00:00Z"), // held
        entry("fine", 2000, "2026-07-09T00:00:00Z"), // compensation: immediate
      ],
      NOW,
    );
    expect(balances).toEqual({ availableCents: 17000, processingCents: 16000 });
  });

  it("reads as 'since the last withdrawal' because withdrawals zero it", () => {
    const balances = deriveWalletBalances(
      [
        entry("escrow_release", 15000, "2026-06-01T00:00:00Z"),
        entry("withdrawal", -15000, "2026-06-20T00:00:00Z"),
        entry("escrow_release", 5000, "2026-06-25T00:00:00Z"),
      ],
      NOW,
    );
    expect(balances).toEqual({ availableCents: 5000, processingCents: 0 });
  });

  it("ignores announcement-side entries — paid outside the wallet (D-037)", () => {
    const balances = deriveWalletBalances(
      [
        entry("fee", -1000, "2026-07-09T00:00:00Z"),
        entry("escrow_hold", -10000, "2026-07-09T00:00:00Z"),
        entry("refund", 10000, "2026-07-09T00:00:00Z"),
        entry("escrow_release", 15000, "2026-07-01T00:00:00Z"),
      ],
      NOW,
    );
    expect(balances).toEqual({ availableCents: 15000, processingCents: 0 });
  });

  it("charges a worker fine against the received balance (D-027)", () => {
    const balances = deriveWalletBalances(
      [
        entry("escrow_release", 15000, "2026-07-01T00:00:00Z"),
        entry("fine", -2500, "2026-07-09T00:00:00Z"),
      ],
      NOW,
    );
    expect(balances).toEqual({ availableCents: 12500, processingCents: 0 });
  });
});
