import { describe, expect, it } from "vitest";

import { firstName } from "./name";

describe("firstName", () => {
  it("returns the first token of a full name", () => {
    expect(firstName("David Buckley")).toBe("David");
    expect(firstName("Ana Maria de Souza")).toBe("Ana");
  });

  it("is idempotent on a single name", () => {
    expect(firstName("David")).toBe("David");
  });

  it("trims surrounding and inner whitespace", () => {
    expect(firstName("  David   Buckley ")).toBe("David");
  });

  it("handles empty / missing values", () => {
    expect(firstName("")).toBe("");
    expect(firstName("   ")).toBe("");
    expect(firstName(null)).toBe("");
    expect(firstName(undefined)).toBe("");
  });
});
