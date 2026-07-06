-- Vinc — Fase 2 blocos 2.1 e 2.2 (D-028)
--
-- 2.1 AUTO-LIBERAÇÃO 48h: if the poster neither confirms nor disputes,
-- the payment releases by itself. awaiting_since records when the worker
-- marked the service complete; a pg_cron job releases stale ones.
--
-- 2.2 CHECK-IN CODE: 4-digit code generated when a candidate is chosen,
-- readable ONLY by the poster (own table + RLS — gigs is world-readable,
-- so the code cannot live there); the worker types it to start.

alter table public.gigs add column awaiting_since timestamptz;
update public.gigs set awaiting_since = now() where status = 'awaiting_confirmation';

create or replace function public.auto_release_confirmations()
returns integer
language sql
security definer
set search_path = public
as $$
  with released as (
    update public.gigs
    set status = 'completed'
    where status = 'awaiting_confirmation'
      and awaiting_since is not null
      and awaiting_since <= now() - interval '48 hours'
    returning id, worker_id, price_cents
  ),
  payouts as (
    insert into public.ledger_entries (user_id, gig_id, type, amount_cents)
    select worker_id, id, 'escrow_release', price_cents from released
  )
  select count(*)::integer from released;
$$;

revoke execute on function public.auto_release_confirmations() from public, anon, authenticated;

select cron.schedule('auto-release-confirmations', '*/15 * * * *',
  'select public.auto_release_confirmations()');

-- ============================================================ check-in
create table public.gig_checkin_codes (
  gig_id uuid primary key references public.gigs (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now()
);

alter table public.gig_checkin_codes enable row level security;

-- Only the POSTER sees the code (they show it to the worker in person);
-- the worker proving presence is the whole point. Writes: service role.
create policy "posters read their gig's check-in code"
  on public.gig_checkin_codes for select to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id and g.poster_id = (select auth.uid())
    )
  );
