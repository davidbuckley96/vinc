import type { SupabaseClient } from "@supabase/supabase-js";

/** A gig occupying the user's agenda, in either role (docs/02 §8). */
export interface AgendaEntry {
  id: string;
  title: string;
  role: "worker" | "poster";
  startsAt: string;
  endsAt: string;
  priceCents: number;
  status: string;
  counterpartName: string | null;
}

interface AgendaRow {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  status: string;
  poster_id: string;
  worker_id: string | null;
  poster: { name: string } | null;
  worker: { name: string } | null;
}

/** Full detail of a gig the user is involved in (docs/02 §4). */
export interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  role: "worker" | "poster";
  startsAt: string;
  endsAt: string;
  priceCents: number;
  address: string;
  counterpartName: string | null;
}

export async function fetchServiceDetail(
  client: SupabaseClient,
  gigId: string,
  userId: string,
): Promise<ServiceDetail | null> {
  const { data, error } = await client
    .from("gigs")
    .select(
      "id, title, description, status, starts_at, ends_at, price_cents, address, poster_id, worker_id, poster:poster_id (name), worker:worker_id (name)",
    )
    .eq("id", gigId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as AgendaRow & { description: string; address: string };
  const role = row.poster_id === userId ? "poster" : "worker";
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    role,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    address: row.address,
    counterpartName: role === "poster" ? (row.worker?.name ?? null) : (row.poster?.name ?? null),
  };
}

/**
 * Everything on the user's agenda: gigs they will work on (accepted /
 * in progress) and gigs they posted that are still active.
 */
export async function fetchMyAgenda(
  client: SupabaseClient,
  userId: string,
): Promise<AgendaEntry[]> {
  const { data, error } = await client
    .from("gigs")
    .select(
      "id, title, starts_at, ends_at, price_cents, status, poster_id, worker_id, poster:poster_id (name), worker:worker_id (name)",
    )
    .or(`worker_id.eq.${userId},poster_id.eq.${userId}`)
    .in("status", ["open", "accepted", "in_progress", "awaiting_confirmation"])
    .order("starts_at");
  if (error) throw new Error(error.message);

  return (data as unknown as AgendaRow[]).map((row) => {
    const role = row.poster_id === userId ? "poster" : "worker";
    return {
      id: row.id,
      title: row.title,
      role,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      priceCents: row.price_cents,
      status: row.status,
      counterpartName: role === "poster" ? (row.worker?.name ?? null) : (row.poster?.name ?? null),
    };
  });
}
