// Edge Function: create-gig
// Publishes a gig with the upfront payment (docs/02 §5.1 — D-013): the
// poster pays the GROSS value at creation — the platform fee (non
// refundable) plus the NET amount escrowed for the worker. Runs with the
// service role because money moves here; the client INSERT policy was
// removed in migration 0006.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { validateGigDraft, type GigDraft } from "../../../packages/core/src/gig-draft.ts";
import { computeGigPricing } from "../../../packages/core/src/pricing.ts";

type ResultCode = "created" | "unauthorized" | "invalid_draft" | "invalid_request";

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

  let draft: GigDraft;
  try {
    ({ draft } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (!draft || typeof draft !== "object") return respond("invalid_request", 400);

  const errors = validateGigDraft(draft, new Date());
  if (errors.length > 0) return respond("invalid_draft", 400, { errors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const posterId = userData.user.id;

  // draft.priceCents is the GROSS the poster pays; the worker sees the net.
  const pricing = computeGigPricing(draft.priceCents);

  const { data: gig, error: insertError } = await admin
    .from("gigs")
    .insert({
      poster_id: posterId,
      category_id: draft.categoryId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      starts_at: draft.startsAt,
      ends_at: draft.endsAt,
      price_cents: pricing.netCents,
      fee_cents: pricing.feeCents,
      address: draft.address.trim(),
      status: "open",
    })
    .select("id")
    .single();
  if (insertError || !gig) return respond("invalid_request", 400);

  // Upfront payment: non-refundable fee + escrowed net (docs/02 §5.1).
  await admin.from("ledger_entries").insert([
    { user_id: posterId, gig_id: gig.id, type: "fee", amount_cents: -pricing.feeCents },
    { user_id: posterId, gig_id: gig.id, type: "escrow_hold", amount_cents: -pricing.netCents },
  ]);

  return respond("created", 200, { gigId: gig.id });
});
