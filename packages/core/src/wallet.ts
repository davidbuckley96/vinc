/**
 * Wallet derivation (docs/02 §5.2 — D-015/D-016/D-021). Pure and
 * self-contained (Deno-safe): balances are ALWAYS derived from the
 * immutable ledger, never stored.
 *
 * Rules:
 * - A service payment (escrow_release) stays "EM PROCESSAMENTO" for 7 days
 *   after it lands — the window for the poster to open a refund request
 *   (Fase 2). After that it becomes withdrawable automatically — no job
 *   needed, the release time is derived from created_at.
 * - Everything else (refunds, cancellation compensation, fees, holds,
 *   withdrawals) hits the available balance immediately.
 * - A withdrawal zeroes the available balance, so "available" always reads
 *   as "received since your last withdrawal".
 */

export const PROCESSING_HOLD_DAYS = 7;

const HOLD_MS = PROCESSING_HOLD_DAYS * 24 * 60 * 60 * 1000;

export interface WalletLedgerLike {
  type: string;
  amountCents: number;
  createdAt: string;
}

/** When a service payment becomes withdrawable (ISO). */
export function releasesAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + HOLD_MS).toISOString();
}

/** True while a service payment is still inside the 7-day hold. */
export function isProcessing(entry: WalletLedgerLike, now: Date): boolean {
  return entry.type === "escrow_release" && now.getTime() < new Date(releasesAt(entry.createdAt)).getTime();
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
): WalletBalances {
  let availableCents = 0;
  let processingCents = 0;
  for (const entry of entries) {
    if (isProcessing(entry, now)) processingCents += entry.amountCents;
    else availableCents += entry.amountCents;
  }
  return { availableCents, processingCents };
}
