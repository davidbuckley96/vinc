// Edge Function: respond-dispute (D-073)
// The WORKER (or, generally, the non-opener participant) adds their side to a
// dispute — used above all to DEFEND against a no-show claim (e.g. "the poster
// never gave me the start code, so I couldn't begin"). Stores a text response
// and optional photos (tagged by='worker'). No money moves; support decides.
//
// Deploy: Management API multipart (verify_jwt=true).

import { createClient } from "npm:@supabase/supabase-js@2";

type ResultCode =
  | "responded"
  | "invalid_reason"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "already_resolved"
  | "invalid_request";

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

  let gigId: unknown, response: unknown, photoPaths: unknown;
  try {
    ({ gigId, response, photoPaths } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string") return respond("invalid_request", 400);
  const text = typeof response === "string" ? response.trim() : "";
  if (text.length < 10 || text.length > 2000) return respond("invalid_reason", 400);
  const photos = Array.isArray(photoPaths) ? photoPaths : [];
  if (photos.length > 5 || photos.some((path) => typeof path !== "string")) {
    return respond("invalid_request", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const userId = userData.user.id;

  // Photos must live in the caller's own folder of the bucket.
  if (photos.some((path) => !(path as string).startsWith(`${userId}/`))) {
    return respond("invalid_request", 400);
  }

  const { data: gig } = await admin
    .from("gigs")
    .select("id, worker_id")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.worker_id !== userId) return respond("forbidden", 403);

  const { data: dispute } = await admin
    .from("disputes")
    .select("id, status")
    .eq("gig_id", gig.id)
    .maybeSingle();
  if (!dispute) return respond("not_found", 404);
  if (dispute.status !== "open") return respond("already_resolved", 409);

  await admin
    .from("disputes")
    .update({ worker_response: text, worker_responded_at: new Date().toISOString() })
    .eq("id", dispute.id);

  if (photos.length > 0) {
    await admin.from("dispute_photos").insert(
      photos.map((path) => ({ dispute_id: dispute.id, path, by: "worker" })),
    );
  }

  return respond("responded", 200);
});
