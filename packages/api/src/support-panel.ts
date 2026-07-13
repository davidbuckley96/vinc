import type { SupabaseClient } from "@supabase/supabase-js";

import type { TicketStatus } from "./support";

/**
 * Painel do Suporte (docs/09 S4): denúncias, tickets escalados e o
 * contexto 360° do usuário. Leituras são RLS-gated a profiles.is_admin;
 * as escritas passam pela Edge Function support-panel-action.
 */

// ----------------------------------------------------------------- reports
export type ReportStatus = "pending" | "actioned" | "dismissed";

export interface ReportItem {
  id: string;
  targetType: "gig" | "message" | "profile";
  targetId: string;
  reporterId: string;
  reporterName: string;
  category: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  /** Título/descrição do alvo, para triagem sem sair da tela. */
  targetLabel: string;
  targetDetail: string | null;
}

export async function fetchReports(client: SupabaseClient): Promise<ReportItem[]> {
  const { data, error } = await client
    .from("reports")
    .select("*, reporter:reporter_id (name)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    target_type: ReportItem["targetType"];
    target_id: string;
    reporter_id: string;
    category: string;
    reason: string;
    status: ReportStatus;
    created_at: string;
    reporter: { name: string } | null;
  }>;

  // Resolve target content per type (small N, one round per bucket).
  const gigIds = rows.filter((r) => r.target_type === "gig").map((r) => r.target_id);
  const profileIds = rows.filter((r) => r.target_type === "profile").map((r) => r.target_id);
  const [gigs, profiles] = await Promise.all([
    gigIds.length
      ? client.from("gigs").select("id, title, description, status").in("id", gigIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; description: string; status: string }> }),
    profileIds.length
      ? client.from("profiles").select("id, name, bio").in("id", profileIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; bio: string | null }> }),
  ]);
  const gigMap = new Map((gigs.data ?? []).map((g) => [g.id, g]));
  const profMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    let targetLabel = "Conteúdo denunciado";
    let targetDetail: string | null = null;
    if (r.target_type === "gig") {
      const g = gigMap.get(r.target_id);
      targetLabel = g ? `Vaga: ${g.title}` : "Vaga (removida)";
      targetDetail = g?.description ?? null;
    } else if (r.target_type === "profile") {
      const p = profMap.get(r.target_id);
      targetLabel = p ? `Perfil: ${p.name}` : "Perfil";
      targetDetail = p?.bio ?? null;
    } else {
      targetLabel = "Mensagem em uma conversa";
    }
    return {
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reporterId: r.reporter_id,
      reporterName: r.reporter?.name ?? "Usuário",
      category: r.category,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      targetLabel,
      targetDetail,
    };
  });
}

// ----------------------------------------------------------------- tickets
export interface TicketItem {
  id: string;
  userId: string;
  userName: string;
  status: TicketStatus;
  updatedAt: string;
  lastMessage: string | null;
}

/** Waiting first (oldest on top), then recently resolved. */
export async function fetchSupportTickets(client: SupabaseClient): Promise<TicketItem[]> {
  const { data, error } = await client
    .from("support_tickets")
    .select("id, user_id, status, updated_at, user:user_id (name)")
    .in("status", ["waiting_support", "resolved"])
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    status: TicketStatus;
    updated_at: string;
    user: { name: string } | null;
  }>;

  // Last message per ticket (small N).
  const ids = rows.map((r) => r.id);
  const last = new Map<string, string>();
  if (ids.length) {
    const { data: msgs } = await client
      .from("support_messages")
      .select("ticket_id, body, created_at")
      .in("ticket_id", ids)
      .order("created_at", { ascending: false });
    for (const m of (msgs ?? []) as Array<{ ticket_id: string; body: string }>) {
      if (!last.has(m.ticket_id)) last.set(m.ticket_id, m.body);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user?.name ?? "Usuário",
    status: r.status,
    updatedAt: r.updated_at,
    lastMessage: last.get(r.id) ?? null,
  }));
}

export interface TicketMessage {
  id: string;
  sender: "user" | "ai" | "agent";
  body: string;
  createdAt: string;
}

export async function fetchTicketThread(
  client: SupabaseClient,
  ticketId: string,
): Promise<TicketMessage[]> {
  const { data, error } = await client
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; sender: TicketMessage["sender"]; body: string; created_at: string }>).map(
    (m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at }),
  );
}

// ------------------------------------------------------- user 360° context
export interface UserGig {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  priceCents: number;
}

export interface LedgerLine {
  type: string;
  amountCents: number;
  createdAt: string;
}

export interface UserContext {
  name: string;
  bio: string | null;
  createdAt: string | null;
  asPoster: UserGig[];
  asWorker: UserGig[];
  ledger: LedgerLine[];
}

const mapGig = (g: {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  price_cents: number;
}): UserGig => ({
  id: g.id,
  title: g.title,
  status: g.status,
  startsAt: g.starts_at,
  priceCents: g.price_cents,
});

export async function fetchUserContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContext> {
  const [profile, poster, worker, ledger] = await Promise.all([
    client.from("profiles").select("name, bio, created_at").eq("id", userId).maybeSingle(),
    client
      .from("gigs")
      .select("id, title, status, starts_at, price_cents")
      .eq("poster_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("gigs")
      .select("id, title, status, starts_at, price_cents")
      .eq("worker_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("ledger_entries")
      .select("type, amount_cents, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const p = profile.data as { name?: string; bio?: string | null; created_at?: string } | null;
  return {
    name: p?.name ?? "Usuário",
    bio: p?.bio ?? null,
    createdAt: p?.created_at ?? null,
    asPoster: ((poster.data ?? []) as Parameters<typeof mapGig>[0][]).map(mapGig),
    asWorker: ((worker.data ?? []) as Parameters<typeof mapGig>[0][]).map(mapGig),
    ledger: ((ledger.data ?? []) as Array<{ type: string; amount_cents: number; created_at: string }>).map(
      (l) => ({ type: l.type, amountCents: l.amount_cents, createdAt: l.created_at }),
    ),
  };
}

/** Find a user by name or exact id/email fragment (admin search). */
export async function searchUsers(
  client: SupabaseClient,
  term: string,
): Promise<{ id: string; name: string }[]> {
  const clean = term.trim();
  if (clean.length < 2) return [];
  const { data, error } = await client
    .from("profiles")
    .select("id, name")
    .ilike("name", `%${clean}%`)
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}

// ------------------------------------------------------------------ actions
export type PanelActionResult = "ok" | "needs_dispute" | "not_found" | "error";

async function invokeAction(
  client: SupabaseClient,
  body: Record<string, unknown>,
): Promise<PanelActionResult> {
  const { data, error } = await client.functions.invoke("support-panel-action", { body });
  if (error) {
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const parsed = (await ctx.json()) as { code?: string };
        if (parsed.code === "needs_dispute") return "needs_dispute";
        if (parsed.code === "not_found") return "not_found";
      }
    } catch {
      // fall through
    }
    return "error";
  }
  const code = (data as { code?: string })?.code;
  if (code === "ok") return "ok";
  if (code === "needs_dispute") return "needs_dispute";
  if (code === "not_found") return "not_found";
  return "error";
}

export function resolveReport(
  client: SupabaseClient,
  input: { reportId: string; decision: "actioned" | "dismissed"; note?: string },
): Promise<PanelActionResult> {
  return invokeAction(client, { action: "resolve_report", ...input });
}

export function replyTicket(
  client: SupabaseClient,
  input: { ticketId: string; replyBody: string },
): Promise<PanelActionResult> {
  return invokeAction(client, { action: "reply_ticket", ...input });
}

export function resolveTicket(client: SupabaseClient, ticketId: string): Promise<PanelActionResult> {
  return invokeAction(client, { action: "resolve_ticket", ticketId });
}

export function cancelGigOnBehalf(
  client: SupabaseClient,
  input: { gigId: string; note?: string },
): Promise<PanelActionResult> {
  return invokeAction(client, { action: "cancel_gig", ...input });
}
