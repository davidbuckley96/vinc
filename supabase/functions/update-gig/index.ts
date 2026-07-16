// Edge Function: update-gig
// The poster edits their own gig while it is OPEN with no pending
// candidate (docs/02 §2, D-017). Editable: category, title, description,
// schedule and address. The PRICE is immutable — it is financially bound
// to the escrow and fee paid at creation (D-013/D-014); to change it the
// poster deletes the gig (net refund) and creates a new one.
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { posterCanEdit, type GigStatus } from "../../../packages/core/src/gig.ts";
import { validateGigDraft, type GigDraft } from "../../../packages/core/src/gig-draft.ts";
import {
  containsContactInfo,
  prohibitedContentCategory,
} from "../../../packages/core/src/moderation.ts";
import { approximateLocation, deriveAreaLabel } from "../../../packages/core/src/location.ts";
import { neighbourhoodCenter } from "../_shared/geo.ts";

type ResultCode =
  | "contact_in_text"
  | "prohibited_content"
  | "updated"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_editable"
  | "has_candidates"
  | "invalid_draft"
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

  let gigId: unknown, draft: GigDraft;
  try {
    ({ gigId, draft } = await request.json());
  } catch {
    return respond("invalid_request", 400);
  }
  if (typeof gigId !== "string" || !draft || typeof draft !== "object") {
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
    .select("id, poster_id, status, price_cents")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return respond("not_found", 404);
  if (gig.poster_id !== userId) return respond("forbidden", 403);
  if (!posterCanEdit(gig.status as GigStatus)) return respond("not_editable", 409);

  // B-25: once anyone has applied (or was chosen), the terms are locked — the
  // poster can't move the time/place under the candidates' feet. Editing is
  // only allowed on an open gig with NO active candidacies (none applied yet,
  // or every applicant was refused).
  const { count: activeCandidates } = await admin
    .from("gig_candidacies")
    .select("id", { count: "exact", head: true })
    .eq("gig_id", gigId)
    .in("status", ["pending", "chosen"]);
  if ((activeCandidates ?? 0) > 0) return respond("has_candidates", 409);

  // The price is not editable: validate the draft against the price that
  // was paid at creation, ignoring whatever the client sent.
  const errors = validateGigDraft({ ...draft, priceCents: gig.price_cents }, new Date());
  const adText = `${draft.title} ${draft.description}`;
  if (containsContactInfo(adText)) {
    return respond("contact_in_text", 400);
  }
  const prohibited = prohibitedContentCategory(adText);
  if (prohibited) {
    return respond("prohibited_content", 400, { category: prohibited });
  }
  if (errors.length > 0) return respond("invalid_draft", 400, { errors });

  // G-10 (docs/16): the public map point is recomputed EXACTLY like create-gig
  // — prefer the structured neighbourhood from the client, resolve its centroid
  // (D-066), fall back to the fixed-offset fuzz only when the geocoder is down.
  // Crucially, the location is only rewritten when the draft actually carries a
  // pin: a legacy gig without exact coords (exactLat null) would otherwise send
  // draft.lat/lng == null on save, NULLing approx_lat/lng and wiping the map
  // link ("não dá pra clicar na localização aproximada", intermittent). When
  // there's no pin we leave area/approx/address untouched.
  const address = draft.address.trim();
  const hasPin = draft.lat != null && draft.lng != null;

  const gigUpdate: Record<string, unknown> = {
    category_id: draft.categoryId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
  };
  if (hasPin) {
    const areaLabel = (draft.area ?? "").trim() || deriveAreaLabel(address);
    const approx =
      (await neighbourhoodCenter(areaLabel, draft.lat!, draft.lng!)) ??
      approximateLocation(draft.lat!, draft.lng!);
    gigUpdate.area = areaLabel;
    gigUpdate.approx_lat = approx?.lat ?? null;
    gigUpdate.approx_lng = approx?.lng ?? null;
  }

  const { data: updated } = await admin
    .from("gigs")
    .update(gigUpdate)
    .eq("id", gig.id)
    .eq("status", "open")
    .select("id");
  if (!updated || updated.length === 0) return respond("state_changed", 409);

  if (hasPin) {
    await admin.from("gig_addresses").upsert({
      gig_id: gig.id,
      address,
      lat: draft.lat,
      lng: draft.lng,
    });
  }

  return respond("updated", 200);
});
