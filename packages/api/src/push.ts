import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Push tokens (Fase 4). Each device registers its Expo push token; the
 * `send-push` Edge Function delivers in-app notifications to them. Claiming
 * a token to the current user handles a device changing hands.
 */
export async function registerPushToken(
  client: SupabaseClient,
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  const { error } = await client.from("push_tokens").upsert(
    { token, user_id: userId, platform, updated_at: new Date().toISOString() },
    { onConflict: "token" },
  );
  if (error) throw new Error(error.message);
}

/** Drops the token (e.g. on sign-out) so the device stops receiving pushes. */
export async function unregisterPushToken(
  client: SupabaseClient,
  token: string,
): Promise<void> {
  await client.from("push_tokens").delete().eq("token", token);
}
