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
