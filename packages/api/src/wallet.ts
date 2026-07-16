import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveWalletBalances, isProcessing, isWalletEntry, releasesAt } from "@vinc/core";

export interface LedgerEntry {
  id: string;
  type:
    | "escrow_hold"
    | "escrow_release"
    | "fee"
    | "fine"
    | "refund"
    | "withdrawal"
    | "debt_repayment";
  amountCents: number;
  gigId: string | null;
  gigTitle: string | null;
  createdAt: string;
}

/** A service payment still inside the 7-day hold (docs/02 §5.2). */
export interface ProcessingEntry extends LedgerEntry {
  releasesAt: string;
  /** Frozen by an open refund dispute — no release date applies (§6). */
  frozen: boolean;
}

export interface Wallet {
  /** Withdrawable now — received since the last withdrawal (D-015). */
  availableCents: number;
  /** Sum of service payments still in the 7-day hold. */
  processingCents: number;
  /** Wallet movements that make up the available balance (since last
   * withdrawal) — the list always sums to availableCents (D-037). */
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
  const [{ data, error }, disputesResult] = await Promise.all([
    client
      .from("ledger_entries")
      .select("id, type, amount_cents, gig_id, created_at, gig:gig_id (title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // Open refund disputes freeze the payment (docs/02 §6); RLS already
    // scopes this to gigs the user participates in.
    client.from("disputes").select("gig_id").eq("status", "open"),
  ]);
  if (error) throw new Error(error.message);
  const frozenGigIds = new Set(
    ((disputesResult.data ?? []) as Array<{ gig_id: string }>).map((row) => row.gig_id),
  );

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

  return buildWallet(entries, new Date(), frozenGigIds);
}

/** Pure assembly, shared with demo mode so both derive identically. */
export function buildWallet(
  entries: LedgerEntry[],
  now: Date,
  frozenGigIds?: ReadonlySet<string>,
): Wallet {
  const { availableCents, processingCents } = deriveWalletBalances(entries, now, frozenGigIds);
  const lastWithdrawal = entries.find((entry) => entry.type === "withdrawal");

  const frozen = (entry: LedgerEntry) =>
    Boolean(frozenGigIds && entry.gigId && frozenGigIds.has(entry.gigId));
  const processingEntries: ProcessingEntry[] = entries
    .filter((entry) => isProcessing(entry, now, frozenGigIds))
    .map((entry) => ({ ...entry, releasesAt: releasesAt(entry.createdAt), frozen: frozen(entry) }));

  // A movement joins the available list when it touches money the user
  // can withdraw: service payments only AFTER the hold ends (they were
  // not part of any earlier withdrawal), compensations and fines when
  // they land. Announcement entries (fee/hold/refund) are statement-only
  // (D-037), so the list always adds up to the displayed balance.
  const effectiveAt = (entry: LedgerEntry) =>
    new Date(
      entry.type === "escrow_release" || entry.type === "debt_repayment"
        ? releasesAt(entry.createdAt)
        : entry.createdAt,
    ).getTime();
  const withdrawnAt = lastWithdrawal ? new Date(lastWithdrawal.createdAt).getTime() : null;
  const availableEntries = entries.filter(
    (entry) =>
      isWalletEntry(entry) &&
      entry.type !== "withdrawal" &&
      !isProcessing(entry, now, frozenGigIds) &&
      (withdrawnAt === null || effectiveAt(entry) > withdrawnAt),
  );

  return { availableCents, processingCents, availableEntries, processingEntries, entries };
}

/** A no-show debt the worker owes (D-071), for the wallet + contest. */
export interface WorkerDebt {
  id: string;
  gigId: string;
  gigTitle: string | null;
  amountCents: number;
  remainingCents: number;
  status: "open" | "settled" | "voided";
  createdAt: string;
}

/**
 * The worker's no-show debts (D-071). Open ones still garnish future payouts;
 * settled/voided are kept for transparency. RLS scopes to the caller.
 */
export async function fetchWorkerDebts(
  client: SupabaseClient,
  userId: string,
): Promise<WorkerDebt[]> {
  const { data, error } = await client
    .from("worker_debts")
    .select("id, gig_id, amount_cents, remaining_cents, status, created_at, gig:gig_id (title)")
    .eq("worker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (
    data as unknown as Array<{
      id: string;
      gig_id: string;
      amount_cents: number;
      remaining_cents: number;
      status: WorkerDebt["status"];
      created_at: string;
      gig: { title: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    gigId: row.gig_id,
    gigTitle: row.gig?.title ?? null,
    amountCents: row.amount_cents,
    remainingCents: row.remaining_cents,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export type WithdrawResult =
  | "withdrawn"
  | "nothing_to_withdraw"
  | "payout_account_missing"
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
