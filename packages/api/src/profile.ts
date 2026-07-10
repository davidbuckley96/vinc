import type { SupabaseClient } from "@supabase/supabase-js";

import type { Gender } from "@vinc/core";

/** The caller's editable profile fields (D-043). */
export interface EditableProfile {
  name: string;
  bio: string | null;
  gender: Gender | null;
  showGender: boolean;
}

export async function fetchMyProfile(
  client: SupabaseClient,
  userId: string,
): Promise<EditableProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("name, bio, gender, show_gender")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    name: data.name as string,
    bio: (data.bio as string | null) ?? null,
    gender: (data.gender as Gender | null) ?? null,
    showGender: (data.show_gender as boolean | null) ?? true,
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
    .update({
      name: input.name.trim(),
      bio: input.bio?.trim() || null,
      gender: input.gender,
      show_gender: input.showGender,
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** A worker's gender for their PUBLIC profile — null unless opted in. */
export async function fetchPublicGender(
  client: SupabaseClient,
  userId: string,
): Promise<Gender | null> {
  const { data, error } = await client
    .from("profiles")
    .select("gender, show_gender")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.show_gender ? ((data.gender as Gender | null) ?? null) : null;
}
