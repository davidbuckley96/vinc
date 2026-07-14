// Edge Function: update-profile (D-046)
// The name and bio are PUBLIC user text, so they go through the same
// contact-info moderation as a gig ad — no phones/links/social handles in
// a profile to pull deals off-platform. Direct client UPDATE on name/bio
// was revoked (migration 0035); this is the only write path.
//
// Deploy: Management API multipart, with the core moderation file attached.

import { createClient } from "npm:@supabase/supabase-js@2";

import { containsContactInfo } from "../../../packages/core/src/moderation.ts";

type ResultCode =
  | "updated"
  | "contact_in_text"
  | "invalid_request"
  | "unauthorized"
  | "error";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(code: ResultCode, status: number): Response {
  return new Response(JSON.stringify({ code }), {
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

  let name: unknown, bio: unknown, city: unknown;
  try {
    ({ name, bio, city } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof name !== "string") return respond("invalid_request", 400);
  if (bio != null && typeof bio !== "string") return respond("invalid_request", 400);
  if (city != null && typeof city !== "string") return respond("invalid_request", 400);

  const cleanName = name.trim();
  const cleanBio = (bio as string | null)?.trim() || null;
  // City is a display label (e.g. "Aracaju, SE"), never an address (D-064).
  const cleanCity = (city as string | null)?.trim() || null;
  if (cleanName.length < 2 || cleanName.length > 80) return respond("invalid_request", 400);
  if (cleanBio && cleanBio.length > 500) return respond("invalid_request", 400);
  if (cleanCity && cleanCity.length > 80) return respond("invalid_request", 400);

  // No contact info in any public profile text (D-046).
  if (containsContactInfo(`${cleanName} ${cleanBio ?? ""} ${cleanCity ?? ""}`)) {
    return respond("contact_in_text", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);

  const { error } = await admin
    .from("profiles")
    .update({ name: cleanName, bio: cleanBio, city: cleanCity })
    .eq("id", userData.user.id);
  if (error) {
    console.error("[update-profile]", error);
    return respond("error", 500);
  }
  return respond("updated", 200);
});
