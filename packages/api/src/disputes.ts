import type { SupabaseClient } from "@supabase/supabase-js";

/** A contested service (docs/02 §6 — D-028). */
export interface Dispute {
  id: string;
  gigId: string;
  openerId: string;
  /** pre_release: escrow frozen; post_release: wallet payment frozen. */
  kind: "pre_release" | "post_release";
  reason: string;
  status: "open" | "resolved";
  refundCents: number | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface DisputeRow {
  id: string;
  gig_id: string;
  opener_id: string;
  kind: Dispute["kind"];
  reason: string;
  status: Dispute["status"];
  refund_cents: number | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

function mapDispute(row: DisputeRow): Dispute {
  return {
    id: row.id,
    gigId: row.gig_id,
    openerId: row.opener_id,
    kind: row.kind,
    reason: row.reason,
    status: row.status,
    refundCents: row.refund_cents,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

/** The dispute of a gig, if any (RLS: participants and admins). */
export async function fetchDispute(
  client: SupabaseClient,
  gigId: string,
): Promise<Dispute | null> {
  const { data, error } = await client
    .from("disputes")
    .select("*")
    .eq("gig_id", gigId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDispute(data as DisputeRow) : null;
}

export type OpenDisputeResult =
  | "opened"
  | "already_disputed"
  | "not_disputable"
  | "window_closed"
  | "invalid_reason"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/**
 * Opens a dispute/refund request (open-dispute Edge Function — D-028).
 * The report is required (20–2000 chars); photoPaths are bucket paths
 * returned by uploadDisputePhoto (max 5).
 */
export async function openDispute(
  client: SupabaseClient,
  gigId: string,
  reason: string,
  photoPaths: string[] = [],
): Promise<OpenDisputeResult> {
  const { data, error } = await client.functions.invoke("open-dispute", {
    body: { gigId, reason, photoPaths },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: OpenDisputeResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: OpenDisputeResult })?.code ?? "network_error";
}

/**
 * Uploads one dispute photo to the private bucket, into the caller's own
 * folder (required by open-dispute). Returns the stored path.
 */
export async function uploadDisputePhoto(
  client: SupabaseClient,
  userId: string,
  gigId: string,
  index: number,
  file: Blob | ArrayBuffer,
  contentType = "image/jpeg",
): Promise<string> {
  const path = `${userId}/${gigId}/${Date.now()}-${index}.jpg`;
  const { error } = await client.storage
    .from("dispute-photos")
    .upload(path, file, { contentType });
  if (error) throw new Error(error.message);
  return path;
}

export type ResolveDisputeResult =
  | "resolved"
  | "invalid_refund"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/**
 * Admin-only resolution (resolve-dispute Edge Function — D-028): total or
 * partial refund capped at the service value; 0 dismisses the dispute.
 * Used by the admin panel (block 2.5).
 */
export async function resolveDispute(
  client: SupabaseClient,
  disputeId: string,
  refundCents: number,
  note?: string,
): Promise<ResolveDisputeResult> {
  const { data, error } = await client.functions.invoke("resolve-dispute", {
    body: { disputeId, refundCents, note },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: ResolveDisputeResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: ResolveDisputeResult })?.code ?? "network_error";
}
