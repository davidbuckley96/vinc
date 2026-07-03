import { describe, expect, it } from "vitest";

import { validateGigDraft, type GigDraft } from "./gig-draft";

const NOW = new Date("2026-07-02T12:00:00Z");

const VALID: GigDraft = {
  categoryId: "cat-1",
  title: "Faxina apartamento 60m²",
  description: "Limpeza completa com produtos fornecidos.",
  startsAt: "2026-07-03T14:00:00Z",
  endsAt: "2026-07-03T17:00:00Z",
  priceCents: 12000,
  address: "Rua das Flores, 100",
};

describe("validateGigDraft", () => {
  it("accepts a valid draft", () => {
    expect(validateGigDraft(VALID, NOW)).toEqual([]);
  });

  it("requires category, price and address", () => {
    const errors = validateGigDraft(
      { ...VALID, categoryId: "", priceCents: 0, address: "  " },
      NOW,
    );
    expect(errors).toContain("category_required");
    expect(errors).toContain("price_required");
    expect(errors).toContain("address_required");
  });

  it("rejects titles that are too short", () => {
    expect(validateGigDraft({ ...VALID, title: "ab" }, NOW)).toContain("title_too_short");
  });

  it("rejects a start in the past", () => {
    expect(
      validateGigDraft({ ...VALID, startsAt: "2026-07-01T14:00:00Z" }, NOW),
    ).toContain("starts_in_past");
  });

  it("rejects end before start", () => {
    expect(
      validateGigDraft({ ...VALID, endsAt: "2026-07-03T13:00:00Z" }, NOW),
    ).toContain("ends_before_starts");
  });

  it("rejects gigs paying less than R$ 10 (D-019)", () => {
    expect(validateGigDraft({ ...VALID, priceCents: 999 }, NOW)).toContain("price_too_low");
    expect(validateGigDraft({ ...VALID, priceCents: 1000 }, NOW)).toEqual([]);
  });

  it("rejects fractional price cents", () => {
    expect(validateGigDraft({ ...VALID, priceCents: 100.5 }, NOW)).toContain("price_required");
  });
});
