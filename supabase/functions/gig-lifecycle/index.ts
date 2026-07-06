// Edge Function: gig-lifecycle
// Drives the service through its lifecycle (docs/02 §4):
//   worker  start    accepted              -> in_progress
//   worker  complete in_progress           -> awaiting_confirmation
//   poster  confirm  in_progress |         -> completed  (+ escrow release)
//                    awaiting_confirmation
// Money only moves here (docs/03 principle 3): confirming releases the
// escrowed amount to the worker's wallet via an immutable ledger entry.
//
// D-032: completing accepts OPTIONAL evidence (report + up to 5 photos
// already uploaded to completion-photos) — the worker's shield against
// old-photo scams; the server upload time is what the analysis trusts.
// A late "complete" after the 12h job already moved the gig to
// awaiting_confirmation only attaches evidence (never punished).
//
// Deploy: supabase functions deploy gig-lifecycle (or Management API)

import { createClient } from "npm:@supabase/supabase-js@2";

import {
  allowedLifecycleAction,
  type GigStatus,
} from "../../../packages/core/src/gig.ts";

type Action = "start" | "complete" | "confirm";

type ResultCode =
  | "done"
  | "wrong_code"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "invalid_action"
  | "state_changed"
  | "invalid_request";

const NEXT_STATUS: Record<Action, GigStatus> = {
  start: "in_progress",
  complete: "awaiting_confirmation",
  confirm: "completed",
};

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

  let gigId: unknown, action: unknown, code: unknown, report: unknown, photoPaths: unknown;
  try {
    ({ gigId, action, code, report, photoPaths } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string" || !["start", "complete", "confirm"].includes(action as string)) {
    return respond("invalid_request", 400);
  }
  const evidenceReport = typeof report === "string" ? report.trim() : "";
  if (evidenceReport.length > 2000) return respond("invalid_request", 400);
  const evidencePhotos = Array.isArray(photoPaths) ? photoPaths : [];
  if (evidencePhotos.length > 5 || evidencePhotos.some((path) => typeof path !== "string")) {
    return respond("invalid_request", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const userId = userData.user.id;

  const { data: gig } = await admin
    .from("gigs")
    .select("id, status, poster_id, worker_id, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);

  const role =
    gig.worker_id === userId ? "worker" : gig.poster_id === userId ? "poster" : null;
  if (!role) return respond("forbidden", 403);

  // Late completion after the 12h job already moved the gig (D-032
  // layer 1/3): the worker's tap only attaches evidence — never an error.
  const lateEvidence =
    action === "complete" && role === "worker" && gig.status === "awaiting_confirmation";
  if (!lateEvidence && allowedLifecycleAction(gig.status as GigStatus, role) !== action) {
    return respond("invalid_action", 409, { status: gig.status });
  }
  // Evidence photos must live in the caller's own bucket folder.
  if (evidencePhotos.some((path) => !(path as string).startsWith(`${userId}/`))) {
    return respond("invalid_request", 400);
  }

  if (action === "start") {
    // Check-in by code (D-028): the worker types the 4 digits shown on
    // the poster's screen. Gigs from before the feature have no code row
    // and start freely.
    const { data: checkin } = await admin
      .from("gig_checkin_codes")
      .select("code")
      .eq("gig_id", gig.id)
      .maybeSingle();
    if (checkin && checkin.code !== String(code ?? "").trim()) {
      return respond("wrong_code", 403);
    }
  }

  if (!lateEvidence) {
    // Atomic transition: only succeeds if the status hasn't changed
    // meanwhile. Completing stamps awaiting_since — the 48h clock (D-028).
    const patch: Record<string, unknown> = { status: NEXT_STATUS[action as Action] };
    if (action === "complete") patch.awaiting_since = new Date().toISOString();
    const { data: updated } = await admin
      .from("gigs")
      .update(patch)
      .eq("id", gig.id)
      .eq("status", gig.status)
      .select("id");
    if (!updated || updated.length === 0) return respond("state_changed", 409);
  }

  // Completion evidence (D-032): stored with the SERVER timestamp.
  if (action === "complete" && (evidenceReport || evidencePhotos.length > 0)) {
    const { data: existing } = await admin
      .from("gig_completions")
      .select("gig_id, report")
      .eq("gig_id", gig.id)
      .maybeSingle();
    if (!existing) {
      await admin.from("gig_completions").insert({
        gig_id: gig.id,
        worker_id: userId,
        report: evidenceReport || null,
      });
    } else if (evidenceReport && !existing.report) {
      await admin.from("gig_completions").update({ report: evidenceReport }).eq("gig_id", gig.id);
    }
    if (evidencePhotos.length > 0) {
      // Evidence is append-only, capped at 5 photos per service.
      const { count } = await admin
        .from("gig_completion_photos")
        .select("id", { count: "exact", head: true })
        .eq("gig_id", gig.id);
      const room = Math.max(0, 5 - (count ?? 0));
      const batch = (evidencePhotos as string[]).slice(0, room);
      if (batch.length > 0) {
        await admin
          .from("gig_completion_photos")
          .insert(batch.map((path) => ({ gig_id: gig.id, path })));
      }
    }
  }

  if (lateEvidence) return respond("done", 200, { status: gig.status });

  if (action === "confirm") {
    // Poster confirmed: release the escrowed amount to the worker.
    // Platform fee is an open question (docs/07 #2) — zero for now.
    await admin.from("ledger_entries").insert({
      user_id: gig.worker_id,
      gig_id: gig.id,
      type: "escrow_release",
      amount_cents: gig.price_cents,
    });
  }

  return respond("done", 200, { status: NEXT_STATUS[action as Action] });
});
