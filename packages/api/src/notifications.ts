import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * In-app notification center (block 2.6). Rows are created by database
 * triggers on the real events (candidacies, gig status, releases,
 * disputes) — including the pg_cron jobs; the app renders the pt-BR text
 * from `type` + the gig title.
 */

export type NotificationType =
  | "new_candidate"
  | "chosen"
  | "not_chosen"
  | "service_started"
  | "service_completed"
  | "payment_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "cancelled_by_poster"
  | "cancelled_by_worker"
  | "gig_expired";

export interface AppNotification {
  id: string;
  type: NotificationType;
  gigId: string | null;
  gigTitle: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function fetchNotifications(
  client: SupabaseClient,
  userId: string,
): Promise<AppNotification[]> {
  const { data, error } = await client
    .from("notifications")
    .select("id, type, gig_id, read_at, created_at, gig:gig_id (title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (
    data as unknown as Array<{
      id: string;
      type: NotificationType;
      gig_id: string | null;
      read_at: string | null;
      created_at: string;
      gig: { title: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    type: row.type,
    gigId: row.gig_id,
    gigTitle: row.gig?.title ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

/** Badge count for the bell. */
export async function fetchUnreadNotificationsCount(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Marks everything read (opening the center clears the badge). */
export async function markNotificationsRead(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
