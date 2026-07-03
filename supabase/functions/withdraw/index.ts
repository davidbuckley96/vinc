// Edge Function: withdraw
// Simulated withdrawal (docs/02 §5.2 — D-015/D-021): moves the user's
// whole AVAILABLE balance out of the wallet in one ledger entry, so
// "available" always reads as "received since your last withdrawal".
// Amounts still inside the 7-day processing hold cannot be withdrawn.
// MVP: no money actually moves — the real Pix payout arrives with the
// payment gateway (Fase 3).
//
// Deploy: Management API multipart (see docs/05 roadmap).

import { createClient } from "npm:@supabase/supabase-js@2";

import { deriveWalletBalances } from "../../../packages/core/src/wallet.ts";

type ResultCode = "withdrawn" | "nothing_to_withdraw" | "unauthorized" | "invalid_request";

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return respond("unauthorized", 401);
  const userId = userData.user.id;

  const { data: rows, error } = await admin
    .from("ledger_entries")
    .select("type, amount_cents, created_at")
    .eq("user_id", userId);
  if (error) return respond("invalid_request", 400);

  const { availableCents } = deriveWalletBalances(
    (rows ?? []).map((row) => ({
      type: row.type,
      amountCents: row.amount_cents,
      createdAt: row.created_at,
    })),
    new Date(),
  );
  if (availableCents <= 0) return respond("nothing_to_withdraw", 409);

  // MVP note: a double-tap race could in theory insert two withdrawals;
  // the second would drive the balance negative and the discrepancy is
  // visible in the ledger. The real gateway payout (Fase 3) replaces this
  // with a proper idempotent transfer.
  await admin.from("ledger_entries").insert({
    user_id: userId,
    gig_id: null,
    type: "withdrawal",
    amount_cents: -availableCents,
  });

  return respond("withdrawn", 200, { withdrawnCents: availableCents });
});
