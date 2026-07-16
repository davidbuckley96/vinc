/**
 * Wallet derivation (docs/02 §5.2 — D-015/D-016/D-021/D-037). Pure and
 * self-contained (Deno-safe): balances are ALWAYS derived from the
 * immutable ledger, never stored.
 *
 * Rules:
 * - The wallet holds only money the user RECEIVED — service payments and
 *   cancellation compensations — minus fines charged and withdrawals
 *   (D-037). Announcement-side entries (fee, escrow_hold, refund) are
 *   paid and returned OUTSIDE the wallet (Pix at publication, Pix back
 *   on refunds) and appear only in the statement.
 * - A service payment (escrow_release) stays "EM PROCESSAMENTO" for 7 days
 *   after it lands — the window for the poster to open a refund request
 *   (Fase 2). After that it becomes withdrawable automatically — no job
 *   needed, the release time is derived from created_at.
 * - Compensations and fines hit the available balance immediately.
 * - A withdrawal zeroes the available balance, so "available" always reads
 *   as "received since your last withdrawal".
 */

export const PROCESSING_HOLD_DAYS = 7;

/**
 * Entry types that move the WALLET (withdrawable money). Everything else
 * (fee, escrow_hold, refund) belongs to the announcement payment, which
 * happens outside the wallet — statement only (D-037).
 */
const WALLET_ENTRY_TYPES: ReadonlySet<string> = new Set([
  "escrow_release",
  "fine",
  "withdrawal",
  // D-071: the slice of a released payout seized to repay a no-show debt — a
  // negative entry that reduces the wallet, held on the SAME 7-day clock as
  // the earning it comes from so both clear together (see HELD_TYPES).
  "debt_repayment",
]);

export function isWalletEntry(entry: { type: string }): boolean {
  return WALLET_ENTRY_TYPES.has(entry.type);
}

/**
 * Types that sit in the 7-day processing hold: the service payment and the
 * debt slice taken from it at release (D-071). Both are created together, so
 * aligning their hold keeps `available` from dipping negative while the
 * earning is still processing.
 */
const HELD_TYPES: ReadonlySet<string> = new Set(["escrow_release", "debt_repayment"]);

const HOLD_MS = PROCESSING_HOLD_DAYS * 24 * 60 * 60 * 1000;

export interface WalletLedgerLike {
  type: string;
  amountCents: number;
  createdAt: string;
  /** Needed to freeze payments under an open refund dispute (docs/02 §6). */
  gigId?: string | null;
}

/** When a service payment becomes withdrawable (ISO). */
export function releasesAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + HOLD_MS).toISOString();
}

/**
 * True while a service payment is still inside the 7-day hold — or frozen
 * by an open refund dispute (docs/02 §6 — D-028): a disputed payment
 * never becomes withdrawable, however old, until the dispute resolves.
 */
export function isProcessing(
  entry: WalletLedgerLike,
  now: Date,
  frozenGigIds?: ReadonlySet<string>,
): boolean {
  if (!HELD_TYPES.has(entry.type)) return false;
  if (frozenGigIds && entry.gigId && frozenGigIds.has(entry.gigId)) return true;
  return now.getTime() < new Date(releasesAt(entry.createdAt)).getTime();
}

export interface WalletBalances {
  /** Withdrawable now (received since the last withdrawal). */
  availableCents: number;
  /** Sum of service payments still inside the 7-day hold. */
  processingCents: number;
}

export function deriveWalletBalances(
  entries: readonly WalletLedgerLike[],
  now: Date,
  frozenGigIds?: ReadonlySet<string>,
): WalletBalances {
  let availableCents = 0;
  let processingCents = 0;
  for (const entry of entries) {
    if (!isWalletEntry(entry)) continue;
    if (isProcessing(entry, now, frozenGigIds)) processingCents += entry.amountCents;
    else availableCents += entry.amountCents;
  }
  return { availableCents, processingCents };
}
