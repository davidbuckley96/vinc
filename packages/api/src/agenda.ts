import type { SupabaseClient } from "@supabase/supabase-js";

import { firstName } from "@vinc/core";

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
  /** Sent candidacy still waiting for the poster's choice (D-024). */
  kind?: "candidacy";
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
  /** Area label everyone may see, e.g. "Boa Vista, Recife" (D-028). */
  area: string;
  /** Fuzzed pin; null on gigs created before the map. */
  approxLat: number | null;
  approxLng: number | null;
  /** Exact location — null unless poster or chosen worker (RLS, D-028). */
  address: string | null;
  lat: number | null;
  lng: number | null;
  counterpartId: string | null;
  counterpartName: string | null;
  /** Check-in code (D-028) — only the POSTER receives it (RLS). */
  checkinCode?: string | null;
  /** Cancelled because the worker did not show up (D-071). */
  workerNoShow: boolean;
}

export async function fetchServiceDetail(
  client: SupabaseClient,
  gigId: string,
  userId: string,
): Promise<ServiceDetail | null> {
  const [gigResult, addressResult] = await Promise.all([
    client
      .from("gigs")
      .select(
        "id, title, description, status, starts_at, ends_at, price_cents, area, approx_lat, approx_lng, worker_no_show, poster_id, worker_id, poster:poster_id (name), worker:worker_id (name)",
      )
      .eq("id", gigId)
      .maybeSingle(),
    // RLS returns a row only to the poster / chosen worker (D-028).
    client.from("gig_addresses").select("address, lat, lng").eq("gig_id", gigId).maybeSingle(),
  ]);
  if (gigResult.error) throw new Error(gigResult.error.message);
  if (!gigResult.data) return null;
  const row = gigResult.data as unknown as AgendaRow & {
    description: string;
    area: string;
    approx_lat: number | null;
    approx_lng: number | null;
    worker_no_show: boolean | null;
  };
  const exact = addressResult.data as { address: string; lat: number | null; lng: number | null } | null;
  const role = row.poster_id === userId ? "poster" : "worker";

  // RLS only returns the code to the poster; workers get null.
  let checkinCode: string | null = null;
  if (role === "poster" && row.status === "accepted") {
    const { data: codeRow } = await client
      .from("gig_checkin_codes")
      .select("code")
      .eq("gig_id", gigId)
      .maybeSingle();
    checkinCode = codeRow?.code ?? null;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    role,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    area: row.area,
    approxLat: row.approx_lat,
    approxLng: row.approx_lng,
    address: exact?.address ?? null,
    lat: exact?.lat ?? null,
    lng: exact?.lng ?? null,
    counterpartId: role === "poster" ? row.worker_id : row.poster_id,
    counterpartName:
      firstName(role === "poster" ? row.worker?.name : row.poster?.name) || null,
    checkinCode,
    workerNoShow: row.worker_no_show ?? false,
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
  const [gigsResult, candidaciesResult] = await Promise.all([
    client
      .from("gigs")
      .select(
        "id, title, starts_at, ends_at, price_cents, status, poster_id, worker_id, poster:poster_id (name), worker:worker_id (name)",
      )
      .or(`worker_id.eq.${userId},poster_id.eq.${userId}`)
      .in("status", [
        "pending_payment",
        "open",
        "accepted",
        "in_progress",
        "awaiting_confirmation",
        "disputed",
      ])
      .order("starts_at"),
    // Sent candidacies (pending, gig still open) — shown for awareness;
    // they do NOT block the schedule (D-024).
    client
      .from("gig_candidacies")
      .select("gig:gig_id (id, title, starts_at, ends_at, price_cents, status)")
      .eq("worker_id", userId)
      .eq("status", "pending"),
  ]);
  if (gigsResult.error) throw new Error(gigsResult.error.message);
  if (candidaciesResult.error) throw new Error(candidaciesResult.error.message);

  const entries: AgendaEntry[] = (gigsResult.data as unknown as AgendaRow[]).map((row) => {
    const role = row.poster_id === userId ? "poster" : "worker";
    return {
      id: row.id,
      title: row.title,
      role,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      priceCents: row.price_cents,
      status: row.status,
      counterpartName:
      firstName(role === "poster" ? row.worker?.name : row.poster?.name) || null,
    };
  });

  for (const row of candidaciesResult.data as unknown as Array<{
    gig: { id: string; title: string; starts_at: string; ends_at: string; price_cents: number; status: string } | null;
  }>) {
    if (!row.gig || row.gig.status !== "open") continue;
    entries.push({
      id: row.gig.id,
      title: row.gig.title,
      role: "worker",
      startsAt: row.gig.starts_at,
      endsAt: row.gig.ends_at,
      priceCents: row.gig.price_cents,
      status: "open",
      counterpartName: null,
      kind: "candidacy",
    });
  }
  entries.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return entries;
}
