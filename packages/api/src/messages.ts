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

/**
 * A conversation row for the Messages inbox (D-070). One per gig where the
 * caller is a participant, filtered by the visibility rule server-side (active +
 * disputed always; completed only within 1 month). Reads the `conversations`
 * view, so RLS/visibility live in one place.
 */
export interface Conversation {
  gigId: string;
  title: string;
  status: string;
  myRole: "poster" | "worker";
  counterpartId: string;
  counterpartName: string;
  counterpartAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  unreadCount: number;
}

export async function fetchConversations(client: SupabaseClient): Promise<Conversation[]> {
  const { data, error } = await client
    .from("conversations")
    .select(
      "gig_id, title, status, my_role, counterpart_id, counterpart_name, counterpart_avatar, last_message, last_message_at, last_sender_id, unread_count",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (
    data as Array<{
      gig_id: string;
      title: string;
      status: string;
      my_role: "poster" | "worker";
      counterpart_id: string;
      counterpart_name: string;
      counterpart_avatar: string | null;
      last_message: string | null;
      last_message_at: string | null;
      last_sender_id: string | null;
      unread_count: number;
    }>
  ).map((row) => ({
    gigId: row.gig_id,
    title: row.title,
    status: row.status,
    myRole: row.my_role,
    counterpartId: row.counterpart_id,
    counterpartName: row.counterpart_name,
    counterpartAvatar: row.counterpart_avatar,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    lastSenderId: row.last_sender_id,
    unreadCount: row.unread_count ?? 0,
  }));
}
