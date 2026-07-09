// Edge Function: delete-gig
// The poster deletes their own gig BEFORE approving anyone (docs/02 §5.1,
// D-013/D-040): open/pending_approval → cancelled_by_poster. Since D-040
// nothing was paid before the choice, so there is no money to move here.
// Deleting after approval is a cancellation with a fine — a separate
// flow, not this function.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { posterCanDelete, type GigStatus } from "../../../packages/core/src/gig.ts";

type ResultCode =
  | "deleted"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_deletable"
  | "state_changed"
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
  const userId = userData.user.id;

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, status")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (!posterCanDelete(gig.status as GigStatus)) return respond("not_deletable", 409);

  // Atomic conditional UPDATE: races with a concurrent choice/expiry
  // resolve to state_changed. A pending candidate's id is kept for
  // history (migration 0008 allows either).
  const { data: cancelled } = await admin
    .from("gigs")
    .update({ status: "cancelled_by_poster" })
    .eq("id", gig.id)
    .in("status", ["open", "pending_approval"])
    .select("id");
  if (!cancelled || cancelled.length === 0) return respond("state_changed", 409);

  // No refund and no ledger: nothing was paid before the choice (D-040).
  return respond("deleted", 200);
});
