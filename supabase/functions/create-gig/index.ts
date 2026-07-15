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
import {
  approximateLocation,
  deriveAreaLabel,
  GENERIC_AREA_LABEL,
} from "../../../packages/core/src/location.ts";
import {
  containsContactInfo,
  prohibitedContentCategory,
} from "../../../packages/core/src/moderation.ts";
import { computeGigPricing } from "../../../packages/core/src/pricing.ts";

type ResultCode =
  | "created"
  | "contact_in_text"
  | "prohibited_content"
  | "too_many_open_gigs"
  | "suspended"
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

const NOMINATIM = "https://nominatim.openstreetmap.org";
const GEO_HEADERS = {
  "Accept-Language": "pt-BR",
  "User-Agent": "VincApp/1.0 (marketplace de servicos; contato@vinc.app)",
};

/**
 * Public map point = the NEIGHBOURHOOD CENTROID (D-066), not a fuzzed pin.
 * Showing the whole bairro centred (no circle) preserves anonymity — everyone
 * in "Manaíra, João Pessoa" maps to the same public centre — and lets the map
 * render layer-free (the WebGL circle janked the pan gesture on Android, V-01).
 * The area label already names the bairro; here we resolve its centre.
 *
 * The search is biased by a viewbox around the EXACT point so it picks the
 * RIGHT "Centro"/"Boa Vista" (there are many in Brazil). Any failure (no match,
 * timeout, network) returns null and the caller falls back to the fixed-offset
 * fuzz — publishing must never depend on the geocoder being up.
 */
async function neighbourhoodCenter(
  areaLabel: string,
  lat: number,
  lng: number,
): Promise<{ lat: number; lng: number } | null> {
  if (areaLabel === GENERIC_AREA_LABEL) return null;
  const d = 0.15; // ~16 km box around the exact point — the bairro is well inside
  const viewbox = `&viewbox=${lng - d},${lat + d},${lng + d},${lat - d}&bounded=1`;
  const url =
    `${NOMINATIM}/search?format=jsonv2&limit=1&countrycodes=br` +
    `&q=${encodeURIComponent(areaLabel)}${viewbox}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { headers: GEO_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    const clat = Number(row?.lat);
    const clng = Number(row?.lon);
    if (!Number.isFinite(clat) || !Number.isFinite(clng)) return null;
    return { lat: clat, lng: clng };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
  const adText = `${draft.title} ${draft.description}`;
  if (containsContactInfo(adText)) {
    return respond("contact_in_text", 400);
  }
  // Clearly-illegal content is refused outright (D-046); nuanced cases go
  // to the human report queue instead.
  const prohibited = prohibitedContentCategory(adText);
  if (prohibited) {
    return respond("prohibited_content", 400, { category: prohibited });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const posterId = userData.user.id;

  // Suspended accounts can't publish (D-046).
  const { data: me } = await admin
    .from("profiles").select("suspended_until").eq("id", posterId).maybeSingle();
  if (me?.suspended_until && new Date(me.suspended_until).getTime() > Date.now()) {
    return respond("suspended", 403, { until: me.suspended_until });
  }

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

  // Candidates see only the bairro centred on the map (D-066); the exact
  // address goes to gig_addresses, readable by the poster and the chosen
  // worker. The public point is the neighbourhood centroid when we can resolve
  // it (better anonymity + a layer-free, fluid map), otherwise the legacy
  // fixed-offset fuzz (D-028/D-030) — publishing never blocks on the geocoder.
  const address = draft.address.trim();
  // Prefer the structured neighbourhood from the client (A2, docs/13); fall back
  // to parsing the display string only when it's absent. Parsing "Rua X, 120 —
  // Boa Vista, Recife" worked, but a road-less pick had no "—" and degraded to
  // the generic label, which also disabled the D-066 centroid.
  const areaLabel = (draft.area ?? "").trim() || deriveAreaLabel(address);
  const approx = draft.lat != null && draft.lng != null
    ? (await neighbourhoodCenter(areaLabel, draft.lat, draft.lng)) ??
      approximateLocation(draft.lat, draft.lng)
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
      area: areaLabel,
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
