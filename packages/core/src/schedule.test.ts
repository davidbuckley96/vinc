import { describe, expect, it } from "vitest";

import { canTransition, posterCancellationIncursFine } from "./gig";
import { formatBRL } from "./money";
import { hasScheduleConflict, rangesOverlap } from "./schedule";

describe("rangesOverlap", () => {
  const gig = { startsAt: "2026-07-10T15:00:00Z", endsAt: "2026-07-10T22:00:00Z" };

  it("detects overlapping ranges", () => {
    expect(
      rangesOverlap(gig, { startsAt: "2026-07-10T21:00:00Z", endsAt: "2026-07-10T23:00:00Z" }),
    ).toBe(true);
  });

  it("allows back-to-back ranges", () => {
    expect(
      rangesOverlap(gig, { startsAt: "2026-07-10T22:00:00Z", endsAt: "2026-07-10T23:00:00Z" }),
    ).toBe(false);
  });

  it("allows ranges on different days", () => {
    expect(
      rangesOverlap(gig, { startsAt: "2026-07-11T15:00:00Z", endsAt: "2026-07-11T22:00:00Z" }),
    ).toBe(false);
  });
});

describe("hasScheduleConflict", () => {
  it("returns false for an empty agenda", () => {
    expect(
      hasScheduleConflict(
        { startsAt: "2026-07-10T15:00:00Z", endsAt: "2026-07-10T22:00:00Z" },
        [],
      ),
    ).toBe(false);
  });
});

describe("gig state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("open", "accepted")).toBe(true);
    expect(canTransition("accepted", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "completed")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("open", "completed")).toBe(false);
    expect(canTransition("completed", "open")).toBe(false);
  });

  it("fines the poster only after acceptance", () => {
    expect(posterCancellationIncursFine("open")).toBe(false);
    expect(posterCancellationIncursFine("accepted")).toBe(true);
    expect(posterCancellationIncursFine("in_progress")).toBe(true);
  });
});

describe("formatBRL", () => {
  it("formats cents as BRL", () => {
    expect(formatBRL(16000).replace(/ /g, " ")).toBe("R$ 160,00");
  });
});
