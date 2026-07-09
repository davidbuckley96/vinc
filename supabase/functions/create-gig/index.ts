// Edge Function: create-gig
// Publishing is FREE (D-040): the gig is born OPEN and the Pix (worker
// amount + platform fee) happens only when the poster CHOOSES a
// candidate (decide-candidacy). With no money at the door, the spam
// defenses are: no contact info in the ad text, a cap on simultaneous
// open gigs for accounts without history, and 1 CPF = 1 account (D-038).
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { validateGigDraft, type GigDraft } from "../../../packages/core/src/gig-draft.ts";
import { approximateLocation, deriveAreaLabel } from "../../../packages/core/src/location.ts";
import { containsContactInfo } from "../../../packages/core/src/moderation.ts";
import { computeGigPricing } from "../../../packages/core/src/pricing.ts";

type ResultCode =
  | "created"
  | "contact_in_text"
  | "too_many_open_gigs"
  | "unauthorized"
  | "invalid_draft"
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

  let draft: GigDraft;
  try {
    ({ draft } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (!draft || typeof draft !== "object") return respond("invalid_request", 400);

  const errors = validateGigDraft(draft, new Date());
  if (errors.length > 0) return respond("invalid_draft", 400, { errors });

  // Contact happens inside the app, after the paid choice (D-040).
  if (containsContactInfo(`${draft.title} ${draft.description}`)) {
    return respond("contact_in_text", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const posterId = userData.user.id;

  // Cap on simultaneous open gigs: 3 without completed history as a
  // poster, 10 with (free posting must not mean free flooding — D-040).
  const [{ count: openCount }, { count: doneCount }] = await Promise.all([
    admin
      .from("gigs")
      .select("id", { count: "exact", head: true })
      .eq("poster_id", posterId)
      .in("status", ["open", "pending_payment"]),
    admin
      .from("gigs")
      .select("id", { count: "exact", head: true })
      .eq("poster_id", posterId)
      .eq("status", "completed"),
  ]);
  const limit = (doneCount ?? 0) > 0 ? 10 : 3;
  if ((openCount ?? 0) >= limit) {
    return respond("too_many_open_gigs", 409, { limit });
  }

  // draft.priceCents is what the WORKER receives; the fee goes on top and
  // is charged at the choice (fee_cents stored now, used then).
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

  return respond("created", 200, { gigId: gig.id });
});
