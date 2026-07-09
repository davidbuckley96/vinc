// Edge Function: withdraw-candidacy (D-039)
// A worker withdraws a PENDING candidacy — no penalty: the gig stays
// open, nothing was blocked, and the candidacy simply leaves the
// poster's list. Re-applying is allowed while the gig is open
// (apply-gig flips withdrawn back to pending). Once CHOSEN, leaving is
// a cancellation with a fine (cancel-gig — D-027), never this.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

type ResultCode =
  | "withdrawn"
  | "not_candidate"
  | "not_pending"
  | "unauthorized"
  | "invalid_request";

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
  const workerId = userData.user.id;

  // Atomic conditional update: only a still-pending candidacy leaves.
  const { data: updated } = await admin
    .from("gig_candidacies")
    .update({ status: "withdrawn" })
    .eq("gig_id", gigId)
    .eq("worker_id", workerId)
    .eq("status", "pending")
    .select("id");
  if (updated && updated.length > 0) return respond("withdrawn", 200);

  const { data: existing } = await admin
    .from("gig_candidacies")
    .select("status")
    .eq("gig_id", gigId)
    .eq("worker_id", workerId)
    .maybeSingle();
  return existing ? respond("not_pending", 409) : respond("not_candidate", 404);
});
