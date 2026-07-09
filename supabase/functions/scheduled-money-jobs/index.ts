// Edge Function: scheduled-money-jobs (Fase 3.4 — D-035)
// The two maintenance jobs that MOVE MONEY, moved out of SQL so they can
// call the PaymentProvider port:
//   1. Expiration (D-022): gigs that reached their start time with
//      nobody approved expire and the NET is refunded (the fee stays).
//   2. 48h auto-release (D-028): unanswered completions release the
//      escrow to the worker.
// Invoked by pg_cron via pg_net every 15 min (migration 0025); gated by
// the x-cron-secret header. Both loops use atomic conditional updates —
// only the caller that wins the transition moves money, so overlapping
// or repeated invocations can never double-move.
//
// Deployed with verify_jwt=false (pg_net sends no Supabase JWT).

import { createClient } from "npm:@supabase/supabase-js@2";

import { getPaymentProvider } from "../_shared/payment-provider.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

Deno.serve(async (request) => {
  const secret = request.headers.get("x-cron-secret") ?? "";
  if (!secret || secret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const provider = getPaymentProvider(admin);

  // ---- 1. Expire gigs past their start with nobody approved (D-022).
  let expired = 0;
  const { data: dueGigs } = await admin
    .from("gigs")
    .select("id, poster_id, price_cents, status")
    .in("status", ["open", "pending_approval"])
    .lte("starts_at", new Date().toISOString())
    .limit(100);
  for (const gig of dueGigs ?? []) {
    const { data: won } = await admin
      .from("gigs")
      .update({ status: "expired", worker_id: null })
      .eq("id", gig.id)
      .eq("status", gig.status)
      .select("id");
    if (!won || won.length === 0) continue;
    await admin.from("ledger_entries").insert({
      user_id: gig.poster_id,
      gig_id: gig.id,
      type: "refund",
      amount_cents: gig.price_cents,
    });
    await provider.refundPoster({
      posterId: gig.poster_id,
      gigId: gig.id,
      amountCents: gig.price_cents,
    });
    expired += 1;
  }

  // ---- 2. Release confirmations unanswered for 48h (D-028).
  let released = 0;
  const cutoff = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: staleGigs } = await admin
    .from("gigs")
    .select("id, worker_id, price_cents")
    .eq("status", "awaiting_confirmation")
    .not("awaiting_since", "is", null)
    .lte("awaiting_since", cutoff)
    .limit(100);
  for (const gig of staleGigs ?? []) {
    if (!gig.worker_id) continue;
    const { data: won } = await admin
      .from("gigs")
      .update({ status: "completed" })
      .eq("id", gig.id)
      .eq("status", "awaiting_confirmation")
      .select("id");
    if (!won || won.length === 0) continue;
    await admin.from("ledger_entries").insert({
      user_id: gig.worker_id,
      gig_id: gig.id,
      type: "escrow_release",
      amount_cents: gig.price_cents,
    });
    await provider.releaseToWorker({
      workerId: gig.worker_id,
      gigId: gig.id,
      amountCents: gig.price_cents,
    });
    released += 1;
  }

  return new Response(JSON.stringify({ ok: true, expired, released }), {
    status: 200,
    headers: JSON_HEADERS,
  });
});
