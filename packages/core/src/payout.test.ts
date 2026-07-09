import { describe, expect, it } from "vitest";

import { isValidCpf, validatePixKey } from "./payout";

describe("isValidCpf", () => {
  it("accepts a valid CPF and rejects typos/fakes", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("validatePixKey", () => {
  it("normalizes each key type", () => {
    expect(validatePixKey("cpf", "529.982.247-25")).toEqual({
      ok: true,
      normalized: "52998224725",
    });
    expect(validatePixKey("phone", "(81) 99999-1234")).toEqual({
      ok: true,
      normalized: "+5581999991234",
    });
    expect(validatePixKey("phone", "+55 81 99999-1234").normalized).toBe("+5581999991234");
    expect(validatePixKey("email", " Maria@Email.com ")).toEqual({
      ok: true,
      normalized: "maria@email.com",
    });
    expect(
      validatePixKey("random", "123E4567-E89B-12D3-A456-426614174000").normalized,
    ).toBe("123e4567e89b12d3a456426614174000");
  });

  it("rejects invalid keys with codes", () => {
    expect(validatePixKey("cpf", "111.111.111-11").error).toBe("key_invalid");
    expect(validatePixKey("phone", "999").error).toBe("key_invalid");
    expect(validatePixKey("email", "sem-arroba").error).toBe("key_invalid");
    expect(validatePixKey("random", "abc").error).toBe("key_invalid");
    expect(validatePixKey("email", "  ").error).toBe("key_required");
  });
});
