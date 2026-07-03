import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * User blocking (docs/02 §8): effects apply both ways; management (create/
 * remove) belongs to the blocker only. Listing/candidacy enforcement lives
 * in the backend (visible_open_gigs view + apply-gig function).
 */

export interface BlockStatus {
  /** I blocked them. */
  blockedByMe: boolean;
  /** They blocked me. */
  blockedMe: boolean;
}

export async function fetchBlockStatus(
  client: SupabaseClient,
  myId: string,
  otherId: string,
): Promise<BlockStatus> {
  const { data, error } = await client
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${myId},blocked_id.eq.${otherId}),` +
        `and(blocker_id.eq.${otherId},blocked_id.eq.${myId})`,
    );
  if (error) throw new Error(error.message);
  return {
    blockedByMe: data.some((row) => row.blocker_id === myId),
    blockedMe: data.some((row) => row.blocker_id === otherId),
  };
}

export async function blockUser(
  client: SupabaseClient,
  myId: string,
  otherId: string,
): Promise<void> {
  const { error } = await client
    .from("user_blocks")
    .upsert({ blocker_id: myId, blocked_id: otherId });
  if (error) throw new Error(error.message);
}

export async function unblockUser(
  client: SupabaseClient,
  myId: string,
  otherId: string,
): Promise<void> {
  const { error } = await client
    .from("user_blocks")
    .delete()
    .eq("blocker_id", myId)
    .eq("blocked_id", otherId);
  if (error) throw new Error(error.message);
}
