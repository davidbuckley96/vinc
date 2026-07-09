/**
 * Payout account rules (Fase 3.3 — D-035): the worker registers a Pix
 * key (and the holder's CPF) before the first real payout. Pure and
 * self-contained; the app maps error codes to pt-BR messages.
 */

export const PIX_KEY_TYPES = ["cpf", "phone", "email", "random"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export type PixKeyError = "key_required" | "key_invalid" | "cpf_invalid";

export interface PixKeyValidation {
  ok: boolean;
  /** Normalized key (digits-only for cpf/phone, lowercase for email). */
  normalized?: string;
  error?: PixKeyError;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Random (EVP) keys are UUIDs, with or without dashes. */
const RANDOM_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** CPF check digits (mod-11) — rejects typos and repeated-digit fakes. */
export function isValidCpf(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const position of [9, 10]) {
    let sum = 0;
    for (let index = 0; index < position; index += 1) {
      sum += Number(cpf[index]) * (position + 1 - index);
    }
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(cpf[position])) return false;
  }
  return true;
}

/**
 * Masks a (normalized) Pix key for on-screen display — enough to be
 * recognizable by the owner, useless to shoulder-surfers (round 14 A).
 */
export function maskPixKey(type: PixKeyType, key: string): string {
  if (type === "cpf") {
    const digits = key.replace(/\D/g, "");
    return `•••.•••.•••-${digits.slice(-2)}`;
  }
  if (type === "phone") {
    const digits = key.replace(/\D/g, "");
    const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    return `(${national.slice(0, 2)}) •••••-${national.slice(-4)}`;
  }
  if (type === "email") {
    const at = key.indexOf("@");
    if (at <= 0) return key;
    return `${key[0]}•••${key.slice(at)}`;
  }
  return `${key.slice(0, 4)}•••`;
}

export function validatePixKey(type: PixKeyType, raw: string): PixKeyValidation {
  const value = raw.trim();
  if (!value) return { ok: false, error: "key_required" };

  if (type === "cpf") {
    if (!isValidCpf(value)) return { ok: false, error: "key_invalid" };
    return { ok: true, normalized: value.replace(/\D/g, "") };
  }
  if (type === "phone") {
    const digits = value.replace(/\D/g, "");
    // 10–11 digits (DDD + number), optionally entered with +55.
    const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
    if (national.length < 10 || national.length > 11) return { ok: false, error: "key_invalid" };
    return { ok: true, normalized: `+55${national}` };
  }
  if (type === "email") {
    if (!EMAIL_PATTERN.test(value)) return { ok: false, error: "key_invalid" };
    return { ok: true, normalized: value.toLowerCase() };
  }
  if (!RANDOM_PATTERN.test(value)) return { ok: false, error: "key_invalid" };
  return { ok: true, normalized: value.toLowerCase().replace(/-/g, "") };
}
