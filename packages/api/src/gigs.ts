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
  posterId: string;
  description: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  address: string;
  /** Map pin (docs/02 §2.1, D-023); null on gigs created before the map. */
  lat: number | null;
  lng: number | null;
  categoryId: string;
  posterName: string;
}

interface GigRow {
  id: string;
  title: string;
  poster_id: string;
  description: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  address: string;
  lat: number | null;
  lng: number | null;
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

/**
 * Lists via the visible_open_gigs view, which already excludes gigs the
 * caller was refused for and gigs from blocked pairs (docs/02 §3/§8).
 */
export interface TimeSlotFilter {
  /** ISO range; gigs that OVERLAP it match (docs/02: busca por horário). */
  startsAt: string;
  endsAt: string;
}

export async function fetchOpenGigs(
  client: SupabaseClient,
  filter: { categoryId?: string; slot?: TimeSlotFilter } = {},
): Promise<OpenGig[]> {
  let query = client
    .from("visible_open_gigs")
    .select("id, title, description, starts_at, ends_at, price_cents, address, lat, lng, category_id, poster_id, poster_name")
    .order("starts_at")
    .limit(50);
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  if (filter.slot) {
    query = query.lt("starts_at", filter.slot.endsAt).gt("ends_at", filter.slot.startsAt);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as (Omit<GigRow, "poster"> & { poster_name: string })[]).map((row) => ({
    id: row.id,
    title: row.title,
    posterId: row.poster_id,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    categoryId: row.category_id,
    posterName: row.poster_name,
  }));
}

export async function fetchGigById(
  client: SupabaseClient,
  gigId: string,
): Promise<OpenGig | null> {
  const { data, error } = await client
    .from("gigs")
    .select(
      "id, title, description, starts_at, ends_at, price_cents, address, lat, lng, category_id, poster_id, poster:poster_id (name)",
    )
    .eq("id", gigId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as GigRow;
  return {
    id: row.id,
    title: row.title,
    posterId: row.poster_id,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    categoryId: row.category_id,
    posterName: row.poster?.name ?? "Anunciante",
  };
}

export type ApplyGigResult =
  | "applied"
  | "already_applied"
  | "unauthorized"
  | "not_found"
  | "own_gig"
  | "not_available"
  | "refused_before"
  | "blocked"
  | "schedule_conflict"
  | "invalid_request"
  | "network_error";

/** Calls the apply-gig Edge Function (atomic candidacy lock — D-012). */
export async function applyGig(
  client: SupabaseClient,
  gigId: string,
): Promise<ApplyGigResult> {
  const { data, error } = await client.functions.invoke("apply-gig", {
    body: { gigId },
  });
  if (error) {
    // Non-2xx responses land here; the body still carries our result code.
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: ApplyGigResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: ApplyGigResult })?.code ?? "network_error";
}

/** Anonymized candidate of an open gig (D-024) — no real user id. */
export interface Candidate {
  candidacyId: string;
  appliedAt: string;
  firstName: string;
  avgRating: number | null;
  reviewCount: number;
  completedServices: number;
  topTags: string[];
}

/**
 * Poster-only anonymized candidate list (get-candidates Edge Function).
 * The client never receives worker ids, full names or photos (D-024).
 */
export async function fetchCandidates(
  client: SupabaseClient,
  gigId: string,
): Promise<Candidate[]> {
  const { data, error } = await client.functions.invoke("get-candidates", {
    body: { gigId },
  });
  if (error) throw new Error("get_candidates_failed");
  return (data as { candidates?: Candidate[] })?.candidates ?? [];
}

export type DecideCandidacyResult =
  | "chosen"
  | "refused"
  | "candidate_unavailable"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "invalid_action"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/** Poster chooses/refuses one candidacy (decide-candidacy — D-024). */
export async function decideCandidacy(
  client: SupabaseClient,
  candidacyId: string,
  action: "choose" | "refuse",
): Promise<DecideCandidacyResult> {
  const { data, error } = await client.functions.invoke("decide-candidacy", {
    body: { candidacyId, action },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: DecideCandidacyResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: DecideCandidacyResult })?.code ?? "network_error";
}

export type MyCandidacyStatus = "pending" | "chosen" | "refused" | "not_chosen";

/** The caller's own candidacy for a gig, if any (RLS: workers read own). */
export async function fetchMyCandidacy(
  client: SupabaseClient,
  gigId: string,
  userId: string,
): Promise<MyCandidacyStatus | null> {
  const { data, error } = await client
    .from("gig_candidacies")
    .select("status")
    .eq("gig_id", gigId)
    .eq("worker_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.status as MyCandidacyStatus | undefined) ?? null;
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

export type DeleteGigResult =
  | "deleted"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_deletable"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/**
 * Deletes an own gig BEFORE approving anyone (delete-gig Edge Function):
 * the worker amount returns to the poster, the fee stays (docs/02 §5.1).
 */
export async function deleteGig(
  client: SupabaseClient,
  gigId: string,
): Promise<DeleteGigResult> {
  const { data, error } = await client.functions.invoke("delete-gig", {
    body: { gigId },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: DeleteGigResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: DeleteGigResult })?.code ?? "network_error";
}

export type UpdateGigResult =
  | "updated"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_editable"
  | "invalid_draft"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/**
 * Edits an own OPEN gig (update-gig Edge Function). The price is immutable
 * (D-017) — the function keeps the price paid at creation regardless of
 * draft.priceCents.
 */
export async function updateGig(
  client: SupabaseClient,
  gigId: string,
  draft: GigDraft,
): Promise<UpdateGigResult> {
  const { data, error } = await client.functions.invoke("update-gig", {
    body: { gigId, draft },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: UpdateGigResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: UpdateGigResult })?.code ?? "network_error";
}

export type CancelGigResult =
  | "cancelled"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_cancellable"
  | "state_changed"
  | "invalid_request"
  | "network_error";

/**
 * Cancels an own gig AFTER approval (cancel-gig Edge Function): the worker
 * amount returns to the poster and the D-018 fine is charged — 25% of the
 * worker amount (min R$ 10), 80% of it paid to the harmed worker.
 */
export async function cancelGig(
  client: SupabaseClient,
  gigId: string,
): Promise<CancelGigResult> {
  const { data, error } = await client.functions.invoke("cancel-gig", {
    body: { gigId },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: CancelGigResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: CancelGigResult })?.code ?? "network_error";
}

export type CreateGigResult = "created" | "unauthorized" | "invalid_draft" | "invalid_request" | "network_error";

/**
 * Publishes via the create-gig Edge Function: the poster pays upfront
 * (escrowed worker amount + platform fee on top — docs/02 §5.1,
 * D-013/D-014). draft.priceCents is what the WORKER receives.
 */
export async function createGig(
  client: SupabaseClient,
  draft: GigDraft,
): Promise<CreateGigResult> {
  const { data, error } = await client.functions.invoke("create-gig", {
    body: { draft },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: CreateGigResult };
        if (body.code) return body.code;
      }
    } catch {
      // fall through
    }
    return "network_error";
  }
  return (data as { code?: CreateGigResult })?.code ?? "network_error";
}
