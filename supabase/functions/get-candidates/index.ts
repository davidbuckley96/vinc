// Edge Function: get-candidates
// Anonymized candidate list for the poster of an open gig (D-024). By
// design the client NEVER receives the worker's user id, full name or
// photo — only what matters for the service: first name, worker
// reputation, completed services and the most frequent recent praise
// tags. The candidacy id is a random per-gig uuid, useless for building a
// profile URL. RLS gives posters no direct SELECT on gig_candidacies.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

type ResultCode = "ok" | "unauthorized" | "not_found" | "forbidden" | "invalid_request";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(code: ResultCode, status: number, extra: object = {}): Response {
  return new Response(JSON.stringify({ code, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const jwt = (request.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return respond("unauthorized", 401);

  let gigId: unknown;
  try {
    ({ gigId } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string") return respond("invalid_request", 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, starts_at, ends_at")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userData.user.id) return respond("forbidden", 403);

  const { data: candidacies } = await admin
    .from("gig_candidacies")
    .select("id, worker_id, created_at")
    .eq("gig_id", gig.id)
    .eq("status", "pending")
    .order("created_at");

  // Priority (D-034): workers whose cancelled service OVERLAPS this
  // gig's period go to the top of the list.
  const workerIds = (candidacies ?? []).map((candidacy) => candidacy.worker_id);
  const { data: windows } = workerIds.length
    ? await admin
        .from("priority_windows")
        .select("worker_id")
        .in("worker_id", workerIds)
        .lt("starts_at", gig.ends_at)
        .gt("ends_at", gig.starts_at)
    : { data: [] };
  const priorityWorkers = new Set((windows ?? []).map((row) => row.worker_id as string));

  const candidates = [];
  for (const candidacy of candidacies ?? []) {
    const [{ data: profile }, { data: stats }, { data: reviews }] = await Promise.all([
      admin.from("profiles").select("name").eq("id", candidacy.worker_id).maybeSingle(),
      admin
        .from("profile_stats")
        .select("worker_avg_rating, worker_review_count, completed_as_worker")
        .eq("id", candidacy.worker_id)
        .maybeSingle(),
      admin
        .from("reviews")
        .select("tags")
        .eq("reviewee_id", candidacy.worker_id)
        .eq("reviewee_role", "worker")
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Most frequent praise tags across the recent good reviews.
    const counts = new Map<string, number>();
    for (const review of reviews ?? []) {
      for (const tag of (review.tags as string[] | null) ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    const topTags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);

    candidates.push({
      candidacyId: candidacy.id,
      appliedAt: candidacy.created_at,
      firstName: (profile?.name ?? "Prestador").trim().split(/\s+/)[0],
      avgRating: stats?.worker_avg_rating ?? null,
      reviewCount: stats?.worker_review_count ?? 0,
      completedServices: stats?.completed_as_worker ?? 0,
      topTags,
      priority: priorityWorkers.has(candidacy.worker_id),
    });
  }

  // Relevance ordering (D-039): Destaque (D-034) first, then track
  // record — completed services, then rating. Application TIME is not a
  // factor, so withdrawing and re-applying can't game the position.
  candidates.sort(
    (a, b) =>
      Number(b.priority) - Number(a.priority) ||
      b.completedServices - a.completedServices ||
      (b.avgRating ?? 0) - (a.avgRating ?? 0) ||
      a.appliedAt.localeCompare(b.appliedAt),
  );

  return respond("ok", 200, { candidates });
});
