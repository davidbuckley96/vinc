import { describe, expect, it } from "vitest";

import { allowedLifecycleAction, canTransition, posterCancellationIncursFine } from "./gig";
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
    expect(canTransition("open", "pending_approval")).toBe(true);
    expect(canTransition("pending_approval", "accepted")).toBe(true);
    expect(canTransition("pending_approval", "open")).toBe(true);
    expect(canTransition("accepted", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "awaiting_confirmation")).toBe(true);
    expect(canTransition("awaiting_confirmation", "completed")).toBe(true);
  });

  it("allows choosing a candidate straight from open (D-024)", () => {
    expect(canTransition("open", "accepted")).toBe(true);
  });

  it("lets the poster confirm straight from in_progress (D-032)", () => {
    expect(canTransition("in_progress", "completed")).toBe(true);
  });

  it("freezes and resolves disputes (D-028/D-031)", () => {
    expect(canTransition("awaiting_confirmation", "disputed")).toBe(true);
    expect(canTransition("disputed", "completed")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("open", "completed")).toBe(false);
    expect(canTransition("completed", "open")).toBe(false);
    expect(canTransition("disputed", "open")).toBe(false);
    expect(canTransition("awaiting_confirmation", "cancelled_by_poster")).toBe(false);
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

describe("allowedLifecycleAction", () => {
  it("maps each role/status to its action", () => {
    expect(allowedLifecycleAction("accepted", "worker")).toBe("start");
    expect(allowedLifecycleAction("in_progress", "worker")).toBe("complete");
    expect(allowedLifecycleAction("awaiting_confirmation", "poster")).toBe("confirm");
  });

  it("returns null when the role has nothing to do", () => {
    expect(allowedLifecycleAction("accepted", "poster")).toBeNull();
    expect(allowedLifecycleAction("awaiting_confirmation", "worker")).toBeNull();
    expect(allowedLifecycleAction("completed", "poster")).toBeNull();
    expect(allowedLifecycleAction("open", "worker")).toBeNull();
  });
});
