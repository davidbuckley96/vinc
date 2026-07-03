import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveWalletBalances, isProcessing, releasesAt } from "@vinc/core";

export interface LedgerEntry {
  id: string;
  type: "escrow_hold" | "escrow_release" | "fee" | "fine" | "refund" | "withdrawal";
  amountCents: number;
  gigId: string | null;
  gigTitle: string | null;
  createdAt: string;
}

/** A service payment still inside the 7-day hold (docs/02 §5.2). */
export interface ProcessingEntry extends LedgerEntry {
  releasesAt: string;
}

export interface Wallet {
  /** Withdrawable now — received since the last withdrawal (D-015). */
  availableCents: number;
  /** Sum of service payments still in the 7-day hold. */
  processingCents: number;
  /** Credits that make up the available balance (since last withdrawal). */
  availableEntries: LedgerEntry[];
  /** Service payments waiting for the hold to end. */
  processingEntries: ProcessingEntry[];
  /** Full statement, newest first (the "Ver histórico" screen). */
  entries: LedgerEntry[];
}

/**
 * Everything is DERIVED from the immutable ledger (docs/03 principle 4):
 * balances, the processing hold (created_at + 7 days — no release job) and
 * the "since last withdrawal" reading (withdrawals zero the balance).
 */
export async function fetchWallet(client: SupabaseClient, userId: string): Promise<Wallet> {
  const { data, error } = await client
    .from("ledger_entries")
    .select("id, type, amount_cents, gig_id, created_at, gig:gig_id (title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const entries: LedgerEntry[] = (
    data as unknown as Array<{
      id: string;
      type: LedgerEntry["type"];
      amount_cents: number;
      gig_id: string | null;
      created_at: string;
      gig: { title: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    type: row.type,
    amountCents: row.amount_cents,
    gigId: row.gig_id,
    gigTitle: row.gig?.title ?? null,
    createdAt: row.created_at,
  }));

  return buildWallet(entries, new Date());
}

/** Pure assembly, shared with demo mode so both derive identically. */
export function buildWallet(entries: LedgerEntry[], now: Date): Wallet {
  const { availableCents, processingCents } = deriveWalletBalances(entries, now);
  const lastWithdrawal = entries.find((entry) => entry.type === "withdrawal");

  const processingEntries: ProcessingEntry[] = entries
    .filter((entry) => isProcessing(entry, now))
    .map((entry) => ({ ...entry, releasesAt: releasesAt(entry.createdAt) }));

  // A credit joins the available list when it becomes money the user can
  // touch: service payments only AFTER the hold ends (they were not part
  // of any earlier withdrawal), everything else when it lands.
  const effectiveAt = (entry: LedgerEntry) =>
    new Date(
      entry.type === "escrow_release" ? releasesAt(entry.createdAt) : entry.createdAt,
    ).getTime();
  const withdrawnAt = lastWithdrawal ? new Date(lastWithdrawal.createdAt).getTime() : null;
  const availableEntries = entries.filter(
    (entry) =>
      entry.amountCents > 0 &&
      !isProcessing(entry, now) &&
      (withdrawnAt === null || effectiveAt(entry) > withdrawnAt),
  );

  return { availableCents, processingCents, availableEntries, processingEntries, entries };
}

export type WithdrawResult =
  | "withdrawn"
  | "nothing_to_withdraw"
  | "unauthorized"
  | "invalid_request"
  | "network_error";

/** Simulated full-balance withdrawal (withdraw Edge Function — D-021). */
export async function withdraw(client: SupabaseClient): Promise<WithdrawResult> {
  const { data, error } = await client.functions.invoke("withdraw", { body: {} });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: WithdrawResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: WithdrawResult })?.code ?? "network_error";
}
