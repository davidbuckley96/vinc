import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * In-app messages (docs/02 §9): one immutable thread per gig between the
 * poster and the CHOSEN worker. RLS enforces everything — participants
 * only, no spoofed senders, blocks cut sending both ways.
 */
export interface GigMessage {
  id: string;
  gigId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export async function fetchMessages(
  client: SupabaseClient,
  gigId: string,
): Promise<GigMessage[]> {
  const { data, error } = await client
    .from("gig_messages")
    .select("id, gig_id, sender_id, body, created_at")
    .eq("gig_id", gigId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (
    data as Array<{
      id: string;
      gig_id: string;
      sender_id: string;
      body: string;
      created_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    gigId: row.gig_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export type SendMessageResult = "sent" | "not_allowed" | "network_error";

export async function sendMessage(
  client: SupabaseClient,
  gigId: string,
  senderId: string,
  body: string,
): Promise<SendMessageResult> {
  const { error } = await client
    .from("gig_messages")
    .insert({ gig_id: gigId, sender_id: senderId, body });
  if (!error) return "sent";
  // RLS violation → the pair is blocked or the service is no longer linked.
  return error.code === "42501" ? "not_allowed" : "network_error";
}

/** Counterpart messages newer than my read mark (badge — docs/02 §9). */
export async function fetchUnreadCount(
  client: SupabaseClient,
  gigId: string,
  userId: string,
): Promise<number> {
  const { data: mark } = await client
    .from("gig_message_reads")
    .select("last_read_at")
    .eq("gig_id", gigId)
    .eq("user_id", userId)
    .maybeSingle();

  let query = client
    .from("gig_messages")
    .select("id", { count: "exact", head: true })
    .eq("gig_id", gigId)
    .neq("sender_id", userId);
  if (mark) query = query.gt("created_at", mark.last_read_at);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markMessagesRead(
  client: SupabaseClient,
  gigId: string,
  userId: string,
): Promise<void> {
  await client
    .from("gig_message_reads")
    .upsert({ gig_id: gigId, user_id: userId, last_read_at: new Date().toISOString() });
}
