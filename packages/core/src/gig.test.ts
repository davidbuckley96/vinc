import { describe, expect, it } from "vitest";

import { canTransition, posterCanDelete, posterCanEdit } from "./gig";

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
