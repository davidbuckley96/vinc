import type { SupabaseClient } from "@supabase/supabase-js";

import type { PixKeyType } from "@vinc/core";

/** The worker's payout destination (Fase 3.3 — D-035). */
export interface PayoutAccount {
  pixKeyType: PixKeyType;
  pixKey: string;
  holderCpf: string;
  /** 'verified' once the provider confirms the subaccount (3.7). */
  status: "pending" | "verified";
}

export async function fetchPayoutAccount(
  client: SupabaseClient,
  userId: string,
): Promise<PayoutAccount | null> {
  const { data, error } = await client
    .from("payout_accounts")
    .select("pix_key_type, pix_key, holder_cpf, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    pixKeyType: data.pix_key_type as PixKeyType,
    pixKey: data.pix_key as string,
    holderCpf: data.holder_cpf as string,
    status: data.status as PayoutAccount["status"],
  };
}

export type SavePayoutResult = "saved" | "cpf_taken" | "cpf_banned" | "error";

/**
 * Creates/updates the caller's own account (RLS + column grants). CPF is
 * unique per account and survives deletion (D-046): a CPF already used by
 * another active account → cpf_taken; a banned CPF → cpf_banned.
 */
export async function savePayoutAccount(
  client: SupabaseClient,
  userId: string,
  input: { pixKeyType: PixKeyType; pixKey: string; holderCpf: string },
): Promise<SavePayoutResult> {
  const { error } = await client.from("payout_accounts").upsert(
    {
      user_id: userId,
      pix_key_type: input.pixKeyType,
      pix_key: input.pixKey,
      holder_cpf: input.holderCpf,
    },
    { onConflict: "user_id" },
  );
  if (!error) return "saved";
  // 23505 = unique index on holder_cpf (another active account has it).
  if (error.code === "23505") return "cpf_taken";
  if (/CPF_BANNED/.test(error.message)) return "cpf_banned";
  throw new Error(error.message);
}
