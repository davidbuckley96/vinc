// Shared release-with-debt-collection (D-071). Used by BOTH release paths —
// the poster's manual confirm (gig-lifecycle) and the 48h auto-release
// (scheduled-money-jobs) — so a no-show debt is collected identically however
// the payout happens. Centralised on purpose: two copies would drift.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { applyDebtToPayout } from "../../../packages/core/src/pricing.ts";
import type { PaymentProvider } from "./payment-provider.ts";

export interface ReleaseWithDebtInput {
  workerId: string;
  /** The gig being paid out (NOT the no-show gig). */
  gigId: string;
  netCents: number;
}

/**
 * Releases a completed job's net pay to the worker and, if they carry any
 * open no-show debt, seizes up to 50% of this payout toward it (oldest debt
 * first) so they always keep at least half. The full earning is recorded as
 * `escrow_release` (7-day hold) and the seized slice as a negative
 * `debt_repayment` on the SAME hold — like the self-cancel fine, it has no
 * external movement in the MVP simulation. Returns how much was collected.
 */
export async function releaseToWorkerWithDebt(
  admin: SupabaseClient,
  provider: PaymentProvider,
  { workerId, gigId, netCents }: ReleaseWithDebtInput,
): Promise<{ deductedCents: number }> {
  // The full earning enters the wallet (held 7 days).
  await admin.from("ledger_entries").insert({
    user_id: workerId,
    gig_id: gigId,
    type: "escrow_release",
    amount_cents: netCents,
  });
  await provider.releaseToWorker({ workerId, gigId, amountCents: netCents });

  const { data: debts } = await admin
    .from("worker_debts")
    .select("id, remaining_cents")
    .eq("worker_id", workerId)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  const rows = (debts ?? []) as Array<{ id: string; remaining_cents: number }>;
  const outstanding = rows.reduce((sum, d) => sum + d.remaining_cents, 0);
  if (outstanding <= 0) return { deductedCents: 0 };

  const { deductedCents } = applyDebtToPayout(netCents, outstanding);
  if (deductedCents <= 0) return { deductedCents: 0 };

  // Allocate the seized amount across debts, oldest first.
  let left = deductedCents;
  for (const d of rows) {
    if (left <= 0) break;
    const take = Math.min(left, d.remaining_cents);
    const remaining = d.remaining_cents - take;
    await admin
      .from("worker_debts")
      .update({
        remaining_cents: remaining,
        status: remaining === 0 ? "settled" : "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
    left -= take;
  }

  // The seized slice: negative wallet entry on the same 7-day hold as the
  // earning (so `available` never dips), no external movement.
  await admin.from("ledger_entries").insert({
    user_id: workerId,
    gig_id: gigId,
    type: "debt_repayment",
    amount_cents: -deductedCents,
  });

  return { deductedCents };
}
