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

/** Creates/updates the caller's own account (RLS + column grants). */
export async function savePayoutAccount(
  client: SupabaseClient,
  userId: string,
  input: { pixKeyType: PixKeyType; pixKey: string; holderCpf: string },
): Promise<void> {
  const { error } = await client.from("payout_accounts").upsert(
    {
      user_id: userId,
      pix_key_type: input.pixKeyType,
      pix_key: input.pixKey,
      holder_cpf: input.holderCpf,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}
