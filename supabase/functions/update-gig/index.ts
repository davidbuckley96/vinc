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

type ResultCode =
  | "updated"
  | "unauthorized"
  | "not_found"
  | "forbidden"
  | "not_editable"
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

  // The price is not editable: validate the draft against the price that
  // was paid at creation, ignoring whatever the client sent.
  const errors = validateGigDraft({ ...draft, priceCents: gig.price_cents }, new Date());
  if (errors.length > 0) return respond("invalid_draft", 400, { errors });

  const { data: updated } = await admin
    .from("gigs")
    .update({
      category_id: draft.categoryId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      starts_at: draft.startsAt,
      ends_at: draft.endsAt,
      address: draft.address.trim(),
    })
    .eq("id", gig.id)
    .eq("status", "open")
    .select("id");
  if (!updated || updated.length === 0) return respond("state_changed", 409);

  return respond("updated", 200);
});
