import type { SupabaseClient } from "@supabase/supabase-js";

/** The caller's editable profile fields (D-043/D-044). */
export interface EditableProfile {
  name: string;
  bio: string | null;
}

export async function fetchMyProfile(
  client: SupabaseClient,
  userId: string,
): Promise<EditableProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("name, bio")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    name: data.name as string,
    bio: (data.bio as string | null) ?? null,
  };
}

/** Saves the self-editable fields; column grants block anything else. */
export async function updateMyProfile(
  client: SupabaseClient,
  userId: string,
  input: EditableProfile,
): Promise<void> {
  const { error } = await client
    .from("profiles")
    .update({ name: input.name.trim(), bio: input.bio?.trim() || null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
