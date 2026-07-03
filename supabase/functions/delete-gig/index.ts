// Edge Function: delete-gig
// The poster deletes their own gig BEFORE approving anyone (docs/02 §5.1,
// D-013): open/pending_approval → cancelled_by_poster, the escrowed worker
// amount is refunded to the poster and the service fee stays with the
// platform. Deleting after approval is a cancellation with a fine — a
// separate flow, not this function (docs/07 #1).
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
    .select("id, poster_id, status, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (!posterCanDelete(gig.status as GigStatus)) return respond("not_deletable", 409);

  // Atomic: only the caller that wins this conditional UPDATE refunds, so
  // the escrow can never be refunded twice. A pending candidate's id is
  // kept for history (migration 0008 allows either).
  const { data: cancelled } = await admin
    .from("gigs")
    .update({ status: "cancelled_by_poster" })
    .eq("id", gig.id)
    .in("status", ["open", "pending_approval"])
    .select("id");
  if (!cancelled || cancelled.length === 0) return respond("state_changed", 409);

  // Refund only the worker amount; the fee is non-refundable (docs/02 §5.1).
  await admin.from("ledger_entries").insert({
    user_id: userId,
    gig_id: gig.id,
    type: "refund",
    amount_cents: gig.price_cents,
  });

  return respond("deleted", 200);
});
