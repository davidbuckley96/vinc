-- Vinc — Fase 3.4 (D-035): money jobs move to an Edge Function
--
-- The two pg_cron jobs that MOVED MONEY purely in SQL (expiration refund
-- and the 48h auto-release) can't call the payment provider, so they
-- become one scheduled Edge Function (scheduled-money-jobs) invoked by
-- pg_cron via pg_net. Status-only jobs (auto_mark_awaiting,
-- expire_unpaid_gigs) stay in SQL. The function is gated by the
-- x-cron-secret header (CRON_SECRET function secret); the literal below
-- is replaced by the real value at apply time — the job is idempotent
-- and merely runs maintenance, the secret prevents abuse.

create extension if not exists pg_net;

select cron.unschedule('expire-due-gigs');
select cron.unschedule('auto-release-confirmations');
drop function if exists public.expire_due_gigs();
drop function if exists public.auto_release_confirmations();

select cron.schedule('run-money-jobs', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://gexzpkbqodoyoxudzklb.supabase.co/functions/v1/scheduled-money-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET-set-at-apply-time>'
    ),
    body := '{}'::jsonb
  )
$$);

-- ============================================================ TEST ONLY
-- Provider-side balances/transfers for the MP TEST DOUBLE, so the money
-- can be audited END-TO-END at the "provider": releases credit the
-- worker's subaccount balance, withdrawals debit it as a Pix-out
-- transfer. DROP with mp-mock before production (checklist item 7).
create table public.mp_mock_balances (
  user_id uuid primary key,
  balance_cents integer not null default 0
);
alter table public.mp_mock_balances enable row level security;

create table public.mp_mock_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  kind text not null check (kind in ('credit', 'payout')),
  pix_key text,
  amount_cents integer not null,
  reference text,
  created_at timestamptz not null default now()
);
alter table public.mp_mock_transfers enable row level security;
-- service role only (no policies): clients never touch mock state.
