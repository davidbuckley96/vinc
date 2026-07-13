import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Central de Ajuda (docs/09, fases S2/S3): the FAQ knowledge base (single
 * source shared with the "Vi"), plus the support conversation — a ticket
 * with the Vi that escalates to a human. Writes to tickets/messages go
 * through the support-assistant Edge Function (service role); RLS lets the
 * user only READ their own tickets/messages and the public FAQ.
 */

export interface FaqArticle {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export async function fetchFaq(client: SupabaseClient): Promise<FaqArticle[]> {
  const { data, error } = await client
    .from("faq_articles")
    .select("id, question, answer, category")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FaqArticle[];
}

export type TicketStatus = "ai" | "waiting_support" | "resolved";
export type MessageSender = "user" | "ai" | "agent";

export interface SupportMessage {
  id: string;
  ticketId: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
}

/** The user's most recent support ticket, if any (to resume the chat). */
export async function fetchLatestTicket(
  client: SupabaseClient,
  userId: string,
): Promise<{ id: string; status: TicketStatus } | null> {
  const { data, error } = await client
    .from("support_tickets")
    .select("id, status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row ? { id: row.id as string, status: row.status as TicketStatus } : null;
}

export async function fetchTicketMessages(
  client: SupabaseClient,
  ticketId: string,
): Promise<SupportMessage[]> {
  const { data, error } = await client
    .from("support_messages")
    .select("id, ticket_id, sender, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (
    data as Array<{ id: string; ticket_id: string; sender: MessageSender; body: string; created_at: string }>
  ).map((r) => ({
    id: r.id,
    ticketId: r.ticket_id,
    sender: r.sender,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export interface AssistantResponse {
  ticketId: string;
  reply: string | null;
  status: TicketStatus;
  escalated?: boolean;
}

export type SendToViResult =
  | { ok: true; data: AssistantResponse }
  | { ok: false; error: "network_error" };

/**
 * Sends a message to the Vi. Omit ticketId to open a new conversation;
 * pass it to continue one. The function records the user message, calls
 * the AI provider, records the reply and escalates when needed.
 */
export async function sendToVi(
  client: SupabaseClient,
  input: { ticketId?: string; message: string },
): Promise<SendToViResult> {
  const { data, error } = await client.functions.invoke("support-assistant", {
    body: input,
  });
  if (error) return { ok: false, error: "network_error" };
  return { ok: true, data: data as AssistantResponse };
}
