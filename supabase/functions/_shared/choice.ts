// Shared choice finalization (D-040): the Pix happens at the CHOICE, so
// turning a paid choice into the real acceptance lives here — used by
// decide-candidacy (simulated provider confirms instantly) and by
// payment-webhook (gateway mode, when the Pix lands).

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { ACTIVE_WORKER_STATUSES } from "../../../packages/core/src/gig.ts";
import { hasScheduleConflict } from "../../../packages/core/src/schedule.ts";

export type FinalizeResult = "finalized" | "reopened" | "not_pending";

/**
 * Claims the pending candidacy, re-checks the candidate's schedule (the
 * Pix window is 30 min — they may have committed elsewhere), moves the
 * gig to accepted, writes the upfront ledger entries and the check-in
 * code, and releases the other candidates. The candidacy's pending →
 * chosen transition fires the "chosen" notification — which is exactly
 * why nobody is notified before the payment confirms.
 *
 * Returns "reopened" when the candidate is gone (withdrew / got busy):
 * the gig goes back to open and the caller refunds any captured payment.
 */
export async function finalizeChosenCandidacy(
  admin: SupabaseClient,
  gigId: string,
): Promise<FinalizeResult> {
  const { data: gig } = await admin
    .from("gigs")
    .select(
      "id, poster_id, status, pending_candidacy_id, starts_at, ends_at, price_cents, fee_cents",
    )
    .eq("id", gigId)
    .maybeSingle();
  if (!gig || gig.status !== "pending_payment" || !gig.pending_candidacy_id) {
    return "not_pending";
  }

  const reopen = async () => {
    await admin
      .from("gigs")
      .update({ status: "open", pending_candidacy_id: null, choice_pending_since: null })
      .eq("id", gig.id)
      .eq("status", "pending_payment");
    // Park the charge: a later Pix on it is refunded by the webhook, and
    // it can never be confirmed by a future choice's finalization.
    await admin
      .from("gig_payments")
      .update({ status: "expired" })
      .eq("gig_id", gig.id)
      .eq("status", "pending");
  };

  const { data: candidacy } = await admin
    .from("gig_candidacies")
    .select("id, worker_id, status")
    .eq("id", gig.pending_candidacy_id)
    .maybeSingle();
  if (!candidacy || candidacy.status !== "pending") {
    await reopen();
    return "reopened";
  }

  const { data: commitments } = await admin
    .from("gigs")
    .select("starts_at, ends_at")
    .eq("worker_id", candidacy.worker_id)
    .in("status", [...ACTIVE_WORKER_STATUSES]);
  const committed = (commitments ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
  if (hasScheduleConflict({ startsAt: gig.starts_at, endsAt: gig.ends_at }, committed)) {
    await admin
      .from("gig_candidacies")
      .update({ status: "refused" })
      .eq("id", candidacy.id)
      .eq("status", "pending");
    await reopen();
    return "reopened";
  }

  // Atomic claim: fires the "chosen" notification (trigger) exactly once.
  const { data: claimed } = await admin
    .from("gig_candidacies")
    .update({ status: "chosen" })
    .eq("id", candidacy.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) {
    await reopen();
    return "reopened";
  }

  await admin
    .from("gigs")
    .update({
      status: "accepted",
      worker_id: candidacy.worker_id,
      accepted_at: new Date().toISOString(),
      pending_candidacy_id: null,
      choice_pending_since: null,
    })
    .eq("id", gig.id)
    .eq("status", "pending_payment");

  // Upfront money entries now belong to the CHOICE (D-040): fee + escrow.
  await admin.from("ledger_entries").insert([
    { user_id: gig.poster_id, gig_id: gig.id, type: "fee", amount_cents: -gig.fee_cents },
    { user_id: gig.poster_id, gig_id: gig.id, type: "escrow_hold", amount_cents: -gig.price_cents },
  ]);
  // Check-in code (D-028): shown to the poster, typed by the worker.
  const code = String(Math.floor(1000 + Math.random() * 9000));
  await admin.from("gig_checkin_codes").upsert({ gig_id: gig.id, code });
  await admin
    .from("gig_candidacies")
    .update({ status: "not_chosen" })
    .eq("gig_id", gig.id)
    .eq("status", "pending");
  await admin
    .from("gig_payments")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("gig_id", gig.id)
    .eq("status", "pending");

  return "finalized";
}
