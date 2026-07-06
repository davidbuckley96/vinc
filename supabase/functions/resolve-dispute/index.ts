// Edge Function: resolve-dispute
// An ADMIN (David — D-028) decides a dispute: total or partial refund,
// always capped at the SERVICE value (the fee is never refunded); what is
// not refunded goes/stays with the worker. refundCents = 0 means the
// dispute was dismissed.
//
// Money, by kind:
//   pre_release  — escrow still held: poster gets +refund ('refund'),
//                  worker gets +net−refund ('escrow_release'), gig
//                  disputed → completed.
//   post_release — payment already in the worker's (frozen) wallet:
//                  worker −refund, poster +refund (both 'refund'; one
//                  operation per person — D-020). The freeze lifts when
//                  the dispute leaves 'open'.
// Marking the dispute resolved is the atomic lock: only the first
// resolution moves money.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { getPaymentProvider } from "../_shared/payment-provider.ts";

type ResultCode =
  | "resolved"
  | "invalid_refund"
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

  let disputeId: unknown, refundCents: unknown, note: unknown;
  try {
    ({ disputeId, refundCents, note } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof disputeId !== "string" || !Number.isInteger(refundCents)) {
    return respond("invalid_request", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);

  const { data: caller } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!caller?.is_admin) return respond("forbidden", 403);

  const { data: dispute } = await admin
    .from("disputes")
    .select("id, gig_id, kind, status")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return respond("not_found", 404);
  if (dispute.status !== "open") return respond("state_changed", 409);

  const { data: gig } = await admin
    .from("gigs")
    .select("id, poster_id, worker_id, status, price_cents")
    .eq("id", dispute.gig_id)
    .maybeSingle();
  if (!gig || !gig.worker_id) return respond("not_found", 404);

  // Capped at the service value — the fee is never refunded (D-028).
  const refund = refundCents as number;
  if (refund < 0 || refund > gig.price_cents) return respond("invalid_refund", 400);

  // Atomic lock: only one resolution wins the open → resolved transition.
  const { data: resolved } = await admin
    .from("disputes")
    .update({
      status: "resolved",
      refund_cents: refund,
      resolution_note: typeof note === "string" && note.trim() ? note.trim() : null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", dispute.id)
    .eq("status", "open")
    .select("id");
  if (!resolved || resolved.length === 0) return respond("state_changed", 409);

  const entries: Array<{ user_id: string; gig_id: string; type: string; amount_cents: number }> = [];
  if (dispute.kind === "pre_release") {
    if (refund > 0) {
      entries.push({ user_id: gig.poster_id, gig_id: gig.id, type: "refund", amount_cents: refund });
    }
    if (gig.price_cents - refund > 0) {
      entries.push({
        user_id: gig.worker_id,
        gig_id: gig.id,
        type: "escrow_release",
        amount_cents: gig.price_cents - refund,
      });
    }
  } else if (refund > 0) {
    entries.push(
      { user_id: gig.worker_id, gig_id: gig.id, type: "refund", amount_cents: -refund },
      { user_id: gig.poster_id, gig_id: gig.id, type: "refund", amount_cents: refund },
    );
  }
  if (entries.length > 0) await admin.from("ledger_entries").insert(entries);

  // External execution (D-035): under model A the payment is still held
  // while a dispute is open (the 7-day window defers the real release),
  // so BOTH kinds resolve as refund + remainder release at the provider.
  const provider = getPaymentProvider();
  if (refund > 0) {
    await provider.refundPoster({ posterId: gig.poster_id, gigId: gig.id, amountCents: refund });
  }
  if (dispute.kind === "pre_release" && gig.price_cents - refund > 0) {
    await provider.releaseToWorker({
      workerId: gig.worker_id,
      gigId: gig.id,
      amountCents: gig.price_cents - refund,
    });
  }

  if (dispute.kind === "pre_release") {
    await admin
      .from("gigs")
      .update({ status: "completed" })
      .eq("id", gig.id)
      .eq("status", "disputed");
  }

  return respond("resolved", 200);
});
