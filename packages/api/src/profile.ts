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

export type UpdateProfileResult = "updated" | "contact_in_text" | "error";

/**
 * Saves the self-editable fields through the update-profile Edge Function,
 * which moderates the name/bio for contact info (D-046). Direct client
 * UPDATE on name/bio was revoked (migration 0035).
 */
export async function updateMyProfile(
  client: SupabaseClient,
  _userId: string,
  input: EditableProfile,
): Promise<UpdateProfileResult> {
  const { data, error } = await client.functions.invoke("update-profile", {
    body: { name: input.name, bio: input.bio },
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
