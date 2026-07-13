import type { SupabaseClient } from "@supabase/supabase-js";

import { firstName } from "@vinc/core";

export interface ProfileStats {
  id: string;
  name: string;
  avatarUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
  workerAvgRating: number | null;
  workerReviewCount: number;
  posterAvgRating: number | null;
  posterReviewCount: number;
  completedAsWorker: number;
  completedAsPoster: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  reviewerName: string;
  createdAt: string;
}

export interface ReviewInput {
  gigId: string;
  revieweeId: string;
  /** The reviewee's role in the gig. */
  revieweeRole: "worker" | "poster";
  rating: number;
  comment?: string;
  tags?: string[];
}

export async function fetchProfileStats(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileStats | null> {
  const { data, error } = await client
    .from("profile_stats")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    name: firstName(data.name) || "Usuário",
    avatarUrl: data.avatar_url,
    avgRating: data.avg_rating === null ? null : Number(data.avg_rating),
    reviewCount: Number(data.review_count ?? 0),
    workerAvgRating: data.worker_avg_rating === null ? null : Number(data.worker_avg_rating),
    workerReviewCount: Number(data.worker_review_count ?? 0),
    posterAvgRating: data.poster_avg_rating === null ? null : Number(data.poster_avg_rating),
    posterReviewCount: Number(data.poster_review_count ?? 0),
    completedAsWorker: Number(data.completed_as_worker ?? 0),
    completedAsPoster: Number(data.completed_as_poster ?? 0),
  };
}

export async function fetchRecentReviews(
  client: SupabaseClient,
  userId: string,
  revieweeRole: "worker" | "poster",
  limit = 10,
): Promise<Review[]> {
  const { data, error } = await client
    .from("reviews")
    .select("id, rating, comment, tags, created_at, reviewer:reviewer_id (name)")
    .eq("reviewee_id", userId)
    .eq("reviewee_role", revieweeRole)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (
    data as unknown as Array<{
      id: string;
      rating: number;
      comment: string | null;
      tags: string[] | null;
      created_at: string;
      reviewer: { name: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    tags: row.tags ?? [],
    reviewerName: firstName(row.reviewer?.name) || "Usuário",
    createdAt: row.created_at,
  }));
}

/** True when the user already reviewed this gig (one review per gig/reviewer). */
export async function hasReviewed(
  client: SupabaseClient,
  gigId: string,
  reviewerId: string,
): Promise<boolean> {
  const { count, error } = await client
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("gig_id", gigId)
    .eq("reviewer_id", reviewerId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function submitReview(
  client: SupabaseClient,
  reviewerId: string,
  input: ReviewInput,
): Promise<void> {
  const { error } = await client.from("reviews").insert({
    gig_id: input.gigId,
    reviewer_id: reviewerId,
    reviewee_id: input.revieweeId,
    reviewee_role: input.revieweeRole,
    rating: input.rating,
    comment: input.comment?.trim() || null,
    tags: input.tags ?? [],
  });
  if (error) throw new Error(error.message);
}
