import type { SupabaseClient } from "@supabase/supabase-js";

import { ACTIVE_WORKER_STATUSES } from "@vinc/core";

export interface LedgerEntry {
  id: string;
  type: "escrow_hold" | "escrow_release" | "fee" | "fine" | "refund" | "withdrawal";
  amountCents: number;
  gigId: string | null;
  gigTitle: string | null;
  createdAt: string;
}

export interface Wallet {
  /** Derived from the immutable ledger (docs/03 principle 4). */
  balanceCents: number;
  /** Escrowed amounts the user will receive when their services are confirmed. */
  pendingCents: number;
  entries: LedgerEntry[];
}

export async function fetchWallet(client: SupabaseClient, userId: string): Promise<Wallet> {
  const [entriesResult, pendingResult] = await Promise.all([
    client
      .from("ledger_entries")
      .select("id, type, amount_cents, gig_id, created_at, gig:gig_id (title)")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("gigs")
      .select("price_cents")
      .eq("worker_id", userId)
      .in("status", [...ACTIVE_WORKER_STATUSES]),
  ]);
  if (entriesResult.error) throw new Error(entriesResult.error.message);
  if (pendingResult.error) throw new Error(pendingResult.error.message);

  const entries = (
    entriesResult.data as unknown as Array<{
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

  return {
    balanceCents: entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    pendingCents: pendingResult.data.reduce((sum, row) => sum + row.price_cents, 0),
    entries,
  };
}
