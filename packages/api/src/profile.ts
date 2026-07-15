import type { SupabaseClient } from "@supabase/supabase-js";

/** The caller's editable profile fields (D-043/D-044; city + photo D-064). */
export interface EditableProfile {
  name: string;
  bio: string | null;
  /** Cidade/UF de exibição (só rótulo, nunca endereço) — B-30/D-064. */
  city: string | null;
  avatarUrl: string | null;
}

export async function fetchMyProfile(
  client: SupabaseClient,
  userId: string,
): Promise<EditableProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("name, bio, city, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    name: data.name as string,
    bio: (data.bio as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
  };
}

/**
 * Uploads a profile photo to the public `avatars` bucket and saves its URL on
 * the profile (B-30/D-064). `avatar_url` is client-writable (migration 0035);
 * the file lives under `avatars/<uid>/...` (RLS: only the owner writes there).
 * A timestamped filename sidesteps CDN caching. Returns the public URL, or
 * null on failure.
 */
export async function uploadAvatar(
  client: SupabaseClient,
  userId: string,
  file: Blob | ArrayBuffer | Uint8Array,
  contentType = "image/jpeg",
): Promise<string | null> {
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await client.storage
    .from("avatars")
    .upload(path, file, { contentType, upsert: true });
  if (error) return null;
  const { data } = client.storage.from("avatars").getPublicUrl(path);
  const { error: saveError } = await client
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", userId);
  return saveError ? null : data.publicUrl;
}

export type UpdateProfileResult = "updated" | "contact_in_text" | "error";

/**
 * Saves the self-editable text fields through the update-profile Edge
 * Function, which moderates name/bio/city for contact info (D-046). Direct
 * client UPDATE on those was revoked (migration 0035). The avatar is a
 * separate path (client uploads to Storage + updates avatar_url directly).
 */
export async function updateMyProfile(
  client: SupabaseClient,
  _userId: string,
  input: Pick<EditableProfile, "name" | "bio" | "city">,
): Promise<UpdateProfileResult> {
  const { data, error } = await client.functions.invoke("update-profile", {
    body: { name: input.name, bio: input.bio, city: input.city },
  });
  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = (await context.json()) as { code?: string };
        if (body.code === "contact_in_text") return "contact_in_text";
      }
    } catch {
      // fall through
    }
    return "error";
  }
  return (data as { code?: UpdateProfileResult })?.code === "updated" ? "updated" : "error";
}
