// Edge Function: create-gig
// Publishes a gig with the upfront payment (docs/02 §5.1 — D-013/D-014):
// the poster chooses the exact amount the WORKER receives
// (draft.priceCents) and pays that amount + the platform service fee (non
// refundable) at creation. Runs with the service role because money moves
// here; the client INSERT policy was removed in migration 0006.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { validateGigDraft, type GigDraft } from "../../../packages/core/src/gig-draft.ts";
import { approximateLocation, deriveAreaLabel } from "../../../packages/core/src/location.ts";
import { computeGigPricing } from "../../../packages/core/src/pricing.ts";
import { getPaymentProvider } from "../_shared/payment-provider.ts";

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

  // draft.priceCents is what the WORKER receives; the fee goes on top.
  const pricing = computeGigPricing(draft.priceCents);

  // Candidates see only the area + fuzzed pin (D-028); the exact address
  // goes to gig_addresses, readable by the poster and the chosen worker.
  const address = draft.address.trim();
  const approx = draft.lat != null && draft.lng != null
    ? approximateLocation(draft.lat, draft.lng)
    : null;

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
      area: deriveAreaLabel(address),
      approx_lat: approx?.lat ?? null,
      approx_lng: approx?.lng ?? null,
      status: "open",
    })
    .select("id")
    .single();
  if (insertError || !gig) return respond("invalid_request", 400);

  await admin.from("gig_addresses").insert({
    gig_id: gig.id,
    address,
    lat: draft.lat ?? null,
    lng: draft.lng ?? null,
  });

  // Upfront payment (total = net + fee): non-refundable fee + escrowed
  // worker amount (docs/02 §5.1 — D-014). The ledger records the
  // decision; the provider executes the external charge (D-035 — in
  // gateway mode, 3.2 turns this into a Pix charge + webhook and the gig
  // only publishes once paid).
  await admin.from("ledger_entries").insert([
    { user_id: posterId, gig_id: gig.id, type: "fee", amount_cents: -pricing.feeCents },
    { user_id: posterId, gig_id: gig.id, type: "escrow_hold", amount_cents: -pricing.netCents },
  ]);
  await getPaymentProvider().chargePoster({
    posterId,
    gigId: gig.id,
    netCents: pricing.netCents,
    feeCents: pricing.feeCents,
  });

  return respond("created", 200, { gigId: gig.id });
});
