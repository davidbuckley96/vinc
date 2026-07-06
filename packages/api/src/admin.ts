import type { SupabaseClient } from "@supabase/supabase-js";

import type { Dispute } from "./disputes";

/**
 * Admin panel data (docs/02 §6 — D-028, block 2.5). Everything here is
 * RLS-gated to profiles.is_admin; a non-admin calling these just gets
 * empty results.
 */

/** True when the signed-in user is a platform admin. */
export async function fetchIsAdmin(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
}

/** A queue row: the dispute + enough of the gig to triage. */
export interface DisputeQueueItem extends Dispute {
  gigTitle: string;
  priceCents: number;
  startsAt: string;
  endsAt: string;
  gigStatus: string;
  posterId: string;
  posterName: string;
  workerId: string;
  workerName: string;
}

interface QueueRow {
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
  gig: {
    title: string;
    price_cents: number;
    starts_at: string;
    ends_at: string;
    status: string;
    poster_id: string;
    worker_id: string;
    poster: { name: string } | null;
    worker: { name: string } | null;
  } | null;
}

function mapQueueRow(row: QueueRow): DisputeQueueItem {
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
    gigTitle: row.gig?.title ?? "Serviço",
    priceCents: row.gig?.price_cents ?? 0,
    startsAt: row.gig?.starts_at ?? row.created_at,
    endsAt: row.gig?.ends_at ?? row.created_at,
    gigStatus: row.gig?.status ?? "",
    posterId: row.gig?.poster_id ?? "",
    posterName: row.gig?.poster?.name ?? "Anunciante",
    workerId: row.gig?.worker_id ?? "",
    workerName: row.gig?.worker?.name ?? "Prestador",
  };
}

const QUEUE_SELECT =
  "*, gig:gig_id (title, price_cents, starts_at, ends_at, status, poster_id, worker_id, poster:poster_id (name), worker:worker_id (name))";

/** Open disputes first (oldest on top), then recently resolved. */
export async function fetchDisputeQueue(client: SupabaseClient): Promise<DisputeQueueItem[]> {
  const [open, resolved] = await Promise.all([
    client
      .from("disputes")
      .select(QUEUE_SELECT)
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    client
      .from("disputes")
      .select(QUEUE_SELECT)
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(20),
  ]);
  if (open.error) throw new Error(open.error.message);
  if (resolved.error) throw new Error(resolved.error.message);
  return [
    ...(open.data as unknown as QueueRow[]).map(mapQueueRow),
    ...(resolved.data as unknown as QueueRow[]).map(mapQueueRow),
  ];
}

/** One chat message as shown in the case file. */
export interface CaseMessage {
  senderId: string;
  body: string;
  createdAt: string;
}

/** The full case file the admin decides on (docs/02 §6). */
export interface DisputeCase {
  /** Poster's dispute photos, as short-lived signed URLs. */
  disputePhotoUrls: string[];
  /** Worker's completion evidence (D-032). */
  completionReport: string | null;
  completionReportedAt: string | null;
  completionPhotoUrls: string[];
  /** Whole conversation, oldest first. */
  messages: CaseMessage[];
  /** Service started via typed check-in code (D-028). */
  checkinDone: boolean;
}

async function signedUrls(
  client: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data } = await client.storage.from(bucket).createSignedUrls(paths, 60 * 60);
  return (data ?? []).flatMap((row) => (row.signedUrl ? [row.signedUrl] : []));
}

export async function fetchDisputeCase(
  client: SupabaseClient,
  disputeId: string,
  gigId: string,
): Promise<DisputeCase> {
  const [photos, completion, completionPhotos, messages, checkin] = await Promise.all([
    client.from("dispute_photos").select("path").eq("dispute_id", disputeId).order("created_at"),
    client.from("gig_completions").select("report, created_at").eq("gig_id", gigId).maybeSingle(),
    client.from("gig_completion_photos").select("path").eq("gig_id", gigId).order("created_at"),
    client
      .from("gig_messages")
      .select("sender_id, body, created_at")
      .eq("gig_id", gigId)
      .order("created_at"),
    client.from("gig_checkin_codes").select("gig_id").eq("gig_id", gigId).maybeSingle(),
  ]);

  const [disputePhotoUrls, completionPhotoUrls] = await Promise.all([
    signedUrls(client, "dispute-photos", (photos.data ?? []).map((row) => row.path as string)),
    signedUrls(
      client,
      "completion-photos",
      (completionPhotos.data ?? []).map((row) => row.path as string),
    ),
  ]);

  return {
    disputePhotoUrls,
    completionReport: (completion.data as { report: string | null } | null)?.report ?? null,
    completionReportedAt:
      (completion.data as { created_at: string } | null)?.created_at ?? null,
    completionPhotoUrls,
    messages: ((messages.data ?? []) as Array<{ sender_id: string; body: string; created_at: string }>).map(
      (row) => ({ senderId: row.sender_id, body: row.body, createdAt: row.created_at }),
    ),
    checkinDone: Boolean(checkin.data),
  };
}
