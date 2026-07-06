// Edge Function: open-dispute
// The POSTER contests a service (docs/02 §6 — D-028). Two moments:
//   - awaiting_confirmation → dispute INSTEAD of confirming: the gig
//     moves to 'disputed' and the escrow freezes (the 48h auto-release
//     only touches awaiting_confirmation).
//   - completed, within the 7-day processing hold (D-016) → refund
//     request: the payment freezes in the worker's wallet (derived).
// A written report (20–2000 chars) is required; up to 5 photos already
// uploaded to the dispute-photos bucket may be attached. One dispute per
// gig, ever. No money moves here — resolve-dispute does that.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { PROCESSING_HOLD_DAYS } from "../../../packages/core/src/wallet.ts";

type ResultCode =
  | "opened"
  | "already_disputed"
  | "not_disputable"
  | "window_closed"
  | "invalid_reason"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "state_changed"
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

  let gigId: unknown, reason: unknown, photoPaths: unknown;
  try {
    ({ gigId, reason, photoPaths } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string") return respond("invalid_request", 400);
  const report = typeof reason === "string" ? reason.trim() : "";
  if (report.length < 20 || report.length > 2000) return respond("invalid_reason", 400);
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

  // Photos must live in the caller's own folder of the bucket — nobody
  // can attach someone else's files.
  if (photos.some((path) => !(path as string).startsWith(`${userId}/`))) {
    return respond("invalid_request", 400);
  }

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, status, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);

  let kind: "pre_release" | "post_release";
  if (gig.status === "awaiting_confirmation") {
    kind = "pre_release";
  } else if (gig.status === "completed") {
    kind = "post_release";
    // Refund window: the payment must still be inside the 7-day hold.
    const { data: release } = await admin
      .from("ledger_entries")
      .select("created_at")
      .eq("gig_id", gig.id)
      .eq("type", "escrow_release")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!release) return respond("not_disputable", 409);
    const ageMs = Date.now() - new Date(release.created_at).getTime();
    if (ageMs > PROCESSING_HOLD_DAYS * 24 * 60 * 60 * 1000) {
      return respond("window_closed", 409);
    }
  } else if (gig.status === "disputed") {
    return respond("already_disputed", 409);
  } else {
    return respond("not_disputable", 409);
  }

  // The unique(gig_id) constraint is the real lock: the first insert wins.
  const { data: dispute, error: insertError } = await admin
    .from("disputes")
    .insert({ gig_id: gig.id, opener_id: userId, kind, reason: report })
    .select("id")
    .maybeSingle();
  if (insertError || !dispute) {
    return insertError?.code === "23505"
      ? respond("already_disputed", 409)
      : respond("invalid_request", 400);
  }

  if (kind === "pre_release") {
    const { data: frozen } = await admin
      .from("gigs")
      .update({ status: "disputed" })
      .eq("id", gig.id)
      .eq("status", "awaiting_confirmation")
      .select("id");
    if (!frozen || frozen.length === 0) {
      // The 48h auto-release beat us by seconds: the payment just landed,
      // so the dispute proceeds as a refund request (still in-window).
      await admin.from("disputes").update({ kind: "post_release" }).eq("id", dispute.id);
    }
  }

  if (photos.length > 0) {
    await admin.from("dispute_photos").insert(
      photos.map((path) => ({ dispute_id: dispute.id, path })),
    );
  }

  return respond("opened", 200, { disputeId: dispute.id });
});
