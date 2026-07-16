import { describe, expect, it } from "vitest";

import {
  canDeclareNoShow,
  canTransition,
  NO_SHOW_GRACE_MS,
  posterCanDelete,
  posterCanEdit,
} from "./gig";

describe("deletion transitions (docs/02 §5.1)", () => {
  it("allows deleting before anyone is approved", () => {
    expect(canTransition("open", "cancelled_by_poster")).toBe(true);
    expect(canTransition("pending_approval", "cancelled_by_poster")).toBe(true);
  });

  it("keeps the happy path intact", () => {
    expect(canTransition("open", "pending_approval")).toBe(true);
    expect(canTransition("pending_approval", "accepted")).toBe(true);
    expect(canTransition("pending_approval", "open")).toBe(true);
    expect(canTransition("accepted", "in_progress")).toBe(true);
  });

  it("never resurrects a terminal status", () => {
    expect(canTransition("cancelled_by_poster", "open")).toBe(false);
    expect(canTransition("completed", "open")).toBe(false);
  });

  it("expires unapproved gigs when the start time passes (D-022)", () => {
    expect(canTransition("open", "expired")).toBe(true);
    expect(canTransition("pending_approval", "expired")).toBe(true);
    expect(canTransition("accepted", "expired")).toBe(false);
  });
});

describe("posterCanDelete", () => {
  it("is true only before approval", () => {
    expect(posterCanDelete("open")).toBe(true);
    expect(posterCanDelete("pending_approval")).toBe(true);
    expect(posterCanDelete("accepted")).toBe(false);
    expect(posterCanDelete("in_progress")).toBe(false);
    expect(posterCanDelete("completed")).toBe(false);
  });
});

describe("posterCanEdit", () => {
  it("is true only while open with no candidate", () => {
    expect(posterCanEdit("open")).toBe(true);
    expect(posterCanEdit("pending_approval")).toBe(false);
    expect(posterCanEdit("accepted")).toBe(false);
  });
});

describe("canDeclareNoShow (D-071)", () => {
  const startsAt = "2026-07-16T09:00:00.000Z";
  const after = (ms: number) => new Date(new Date(startsAt).getTime() + ms);

  it("allows the poster once the 30-min tolerance passed and nobody started", () => {
    expect(
      canDeclareNoShow({
        status: "accepted",
        startsAt,
        startedAt: null,
        now: after(NO_SHOW_GRACE_MS),
      }),
    ).toBe(true);
  });

  it("blocks before the tolerance elapses", () => {
    expect(
      canDeclareNoShow({
        status: "accepted",
        startsAt,
        startedAt: null,
        now: after(NO_SHOW_GRACE_MS - 1),
      }),
    ).toBe(false);
  });

  it("blocks once the worker has started (started_at set)", () => {
    expect(
      canDeclareNoShow({
        status: "accepted",
        startsAt,
        startedAt: after(5 * 60 * 1000).toISOString(),
        now: after(NO_SHOW_GRACE_MS),
      }),
    ).toBe(false);
  });

  it("only applies to accepted gigs", () => {
    for (const status of ["in_progress", "open", "completed"] as const) {
      expect(
        canDeclareNoShow({ status, startsAt, startedAt: null, now: after(NO_SHOW_GRACE_MS) }),
      ).toBe(false);
    }
  });
})
