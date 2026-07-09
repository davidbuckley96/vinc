// Edge Function: mp-mock — TEST DOUBLE of the Mercado Pago API (3.2).
//
// Same surface the adapter uses, fake money, state in mp_mock_payments:
//   POST /v1/payments                → creates a pending Pix charge + QR
//   GET  /v1/payments/{id}           → charge status (webhook re-fetch)
//   POST /v1/payments/{id}/refunds   → partial/total refund
//   POST /test/pay/{id}              → "the payer paid": approves and
//                                      fires our payment-webhook
// Auth mimics MP: Authorization Bearer must equal MP_ACCESS_TOKEN.
//
// DELETE this function (and the mp_mock_payments table) before
// production — pre-launch checklist. Deployed with verify_jwt=false.

import { createClient } from "npm:@supabase/supabase-js@2";

const JSON_HEADERS = { "Content-Type": "application/json" };

function reply(status: number, body: object): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (request) => {
  const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token || token !== Deno.env.get("MP_ACCESS_TOKEN")) {
    return reply(401, { error: "unauthorized" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(request.url);
  // Path after the function name: /mp-mock/<...>
  const path = url.pathname.replace(/^.*?\/mp-mock/, "");

  // POST /v1/payments — create a pending Pix charge.
  if (request.method === "POST" && path === "/v1/payments") {
    const body = await request.json();
    const amountCents = Math.round(Number(body.transaction_amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return reply(400, { error: "bad amount" });
    }
    const { data: row, error } = await admin
      .from("mp_mock_payments")
      .insert({ gig_id: body.metadata?.gig_id ?? null, amount_cents: amountCents })
      .select("id")
      .single();
    if (error || !row) return reply(500, { error: "insert failed" });
    return reply(201, {
      id: row.id,
      status: "pending",
      point_of_interaction: {
        transaction_data: {
          qr_code: `00020126580014BR.GOV.BCB.PIX-MOCK-${row.id}`,
          qr_code_base64: "bW9jay1xcg==",
        },
      },
    });
  }

  // GET /v1/payments/{id}
  const getMatch = path.match(/^\/v1\/payments\/([0-9a-f-]+)$/);
  if (request.method === "GET" && getMatch) {
    const { data: row } = await admin
      .from("mp_mock_payments")
      .select("id, status, gig_id")
      .eq("id", getMatch[1])
      .maybeSingle();
    if (!row) return reply(404, { error: "not found" });
    return reply(200, { id: row.id, status: row.status, metadata: { gig_id: row.gig_id } });
  }

  // POST /v1/payments/{id}/refunds — partial/total while approved.
  const refundMatch = path.match(/^\/v1\/payments\/([0-9a-f-]+)\/refunds$/);
  if (request.method === "POST" && refundMatch) {
    const body = await request.json().catch(() => ({}));
    const { data: row } = await admin
      .from("mp_mock_payments")
      .select("id, status, amount_cents, refunded_cents")
      .eq("id", refundMatch[1])
      .maybeSingle();
    if (!row) return reply(404, { error: "not found" });
    if (row.status !== "approved") return reply(400, { error: "not refundable" });
    const amountCents =
      body.amount != null ? Math.round(Number(body.amount) * 100) : row.amount_cents - row.refunded_cents;
    if (amountCents <= 0 || row.refunded_cents + amountCents > row.amount_cents) {
      return reply(400, { error: "amount exceeds remaining" });
    }
    await admin
      .from("mp_mock_payments")
      .update({ refunded_cents: row.refunded_cents + amountCents })
      .eq("id", row.id);
    return reply(201, { id: crypto.randomUUID(), payment_id: row.id, status: "approved" });
  }

  // POST /test/pay/{id} — the fake payer pays; notify our webhook.
  const payMatch = path.match(/^\/test\/pay\/([0-9a-f-]+)$/);
  if (request.method === "POST" && payMatch) {
    const { data: paid } = await admin
      .from("mp_mock_payments")
      .update({ status: "approved" })
      .eq("id", payMatch[1])
      .eq("status", "pending")
      .select("id");
    if (!paid || paid.length === 0) return reply(409, { error: "not pending" });
    const webhook = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ action: "payment.updated", data: { id: payMatch[1] } }),
      },
    );
    return reply(200, { paid: payMatch[1], webhookStatus: webhook.status });
  }

  // POST /test/credit — release/compensation lands in the worker's
  // subaccount balance (model A: money stays at the provider until the
  // withdrawal).
  if (request.method === "POST" && path === "/test/credit") {
    const body = await request.json().catch(() => ({}));
    const amountCents = Math.round(Number(body.amount) * 100);
    if (!body.user_id || !Number.isFinite(amountCents) || amountCents <= 0) {
      return reply(400, { error: "bad credit" });
    }
    const { data: row } = await admin
      .from("mp_mock_balances")
      .select("balance_cents")
      .eq("user_id", body.user_id)
      .maybeSingle();
    await admin.from("mp_mock_balances").upsert({
      user_id: body.user_id,
      balance_cents: (row?.balance_cents ?? 0) + amountCents,
    });
    await admin.from("mp_mock_transfers").insert({
      user_id: body.user_id,
      kind: "credit",
      amount_cents: amountCents,
      reference: body.reference ?? null,
    });
    return reply(201, { credited: amountCents });
  }

  // POST /test/payout — Pix out to the worker's key, debiting the
  // subaccount balance.
  if (request.method === "POST" && path === "/test/payout") {
    const body = await request.json().catch(() => ({}));
    const amountCents = Math.round(Number(body.amount) * 100);
    if (!body.user_id || !body.pix_key || !Number.isFinite(amountCents) || amountCents <= 0) {
      return reply(400, { error: "bad payout" });
    }
    const { data: row } = await admin
      .from("mp_mock_balances")
      .select("balance_cents")
      .eq("user_id", body.user_id)
      .maybeSingle();
    if ((row?.balance_cents ?? 0) < amountCents) {
      return reply(400, { error: "insufficient balance" });
    }
    await admin
      .from("mp_mock_balances")
      .update({ balance_cents: row!.balance_cents - amountCents })
      .eq("user_id", body.user_id);
    await admin.from("mp_mock_transfers").insert({
      user_id: body.user_id,
      kind: "payout",
      pix_key: body.pix_key,
      amount_cents: amountCents,
      reference: body.reference ?? null,
    });
    return reply(201, { paid_out: amountCents });
  }

  // GET /test/balance/{user_id}
  const balanceMatch = path.match(/^\/test\/balance\/([0-9a-f-]+)$/);
  if (request.method === "GET" && balanceMatch) {
    const { data: row } = await admin
      .from("mp_mock_balances")
      .select("balance_cents")
      .eq("user_id", balanceMatch[1])
      .maybeSingle();
    return reply(200, { balance_cents: row?.balance_cents ?? 0 });
  }

  return reply(404, { error: `no route ${request.method} ${path}` });
});
