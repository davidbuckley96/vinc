import type { SupabaseClient } from "@supabase/supabase-js";

import type { GigDraft } from "@vinc/core";

export interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export interface OpenGig {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  address: string;
  categoryId: string;
  posterName: string;
}

interface GigRow {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  address: string;
  category_id: string;
  poster: { name: string } | null;
}

export async function fetchCategories(client: SupabaseClient): Promise<Category[]> {
  const { data, error } = await client
    .from("categories")
    .select("id, name, icon")
    .order("created_at");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchOpenGigs(
  client: SupabaseClient,
  filter: { categoryId?: string } = {},
): Promise<OpenGig[]> {
  let query = client
    .from("gigs")
    .select(
      "id, title, description, starts_at, ends_at, price_cents, address, category_id, poster:poster_id (name)",
    )
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(50);
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as GigRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    address: row.address,
    categoryId: row.category_id,
    posterName: row.poster?.name ?? "Anunciante",
  }));
}

export async function fetchGigById(
  client: SupabaseClient,
  gigId: string,
): Promise<OpenGig | null> {
  const { data, error } = await client
    .from("gigs")
    .select(
      "id, title, description, starts_at, ends_at, price_cents, address, category_id, poster:poster_id (name)",
    )
    .eq("id", gigId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as GigRow;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    address: row.address,
    categoryId: row.category_id,
    posterName: row.poster?.name ?? "Anunciante",
  };
}

export type AcceptGigResult =
  | "accepted"
  | "unauthorized"
  | "not_found"
  | "own_gig"
  | "already_taken"
  | "schedule_conflict"
  | "invalid_request"
  | "network_error";

/** Calls the accept-gig Edge Function (atomic claim + conflict check). */
export async function acceptGig(
  client: SupabaseClient,
  gigId: string,
): Promise<AcceptGigResult> {
  const { data, error } = await client.functions.invoke("accept-gig", {
    body: { gigId },
  });
  if (error) {
    // Non-2xx responses land here; the body still carries our result code.
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: AcceptGigResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: AcceptGigResult })?.code ?? "network_error";
}

export type LifecycleAction = "start" | "complete" | "confirm";

export type LifecycleResult =
  | "done"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "invalid_action"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/** Calls the gig-lifecycle Edge Function (start/complete/confirm). */
export async function gigLifecycle(
  client: SupabaseClient,
  gigId: string,
  action: LifecycleAction,
): Promise<LifecycleResult> {
  const { data, error } = await client.functions.invoke("gig-lifecycle", {
    body: { gigId, action },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: LifecycleResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: LifecycleResult })?.code ?? "network_error";
}

export async function createGig(
  client: SupabaseClient,
  posterId: string,
  draft: GigDraft,
): Promise<void> {
  const { error } = await client.from("gigs").insert({
    poster_id: posterId,
    category_id: draft.categoryId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
    price_cents: draft.priceCents,
    address: draft.address.trim(),
    status: "open",
  });
  if (error) throw new Error(error.message);
}
