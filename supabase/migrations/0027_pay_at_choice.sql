-- Vinc — D-040: free posting; the Pix happens at the CHOICE.
--
-- The gig is born OPEN (no payment). When the poster chooses a candidate
-- the gig moves to pending_payment holding the chosen candidacy; the
-- payment webhook (or the simulated provider, instantly) finalizes the
-- acceptance. Unpaid choices reopen after 30 minutes — status-only, so
-- the job stays in SQL. The platform only earns the fee when the service
-- actually happens.

alter table public.gigs
  add column pending_candidacy_id uuid references public.gig_candidacies (id),
  add column choice_pending_since timestamptz;

-- Stale charges of expired/reopened choices are refunded by the webhook.
alter table public.gig_payments
  drop constraint gig_payments_status_check;
alter table public.gig_payments
  add constraint gig_payments_status_check
  check (status in ('pending', 'confirmed', 'expired', 'refunded'));

-- The unpaid-CREATION expiry (0023) becomes the unpaid-CHOICE expiry:
-- reopen instead of expire — the gig goes back to collecting candidates.
create or replace function public.expire_unpaid_gigs()
returns integer
language sql
security definer
set search_path = public
as $$
  with reopened as (
    update public.gigs
    set status = 'open', pending_candidacy_id = null, choice_pending_since = null
    where status = 'pending_payment'
      and choice_pending_since <= now() - interval '30 minutes'
    returning id
  ),
  charges as (
    update public.gig_payments
    set status = 'expired'
    where gig_id in (select id from reopened) and status = 'pending'
    returning id
  )
  select count(*)::integer from reopened;
$$;
revoke execute on function public.expire_unpaid_gigs() from public, anon, authenticated;

-- Tighter cadence: a 30-minute window with a 15-minute clock could take
-- 45 minutes to fire.
select cron.unschedule('expire-unpaid-gigs');
select cron.schedule('expire-unpaid-gigs', '*/5 * * * *',
  'select public.expire_unpaid_gigs()');

-- ============================================================ reports
-- Anti-spam companion (D-040): anyone signed in can report a gig once;
-- reading is admin/service only (the admin panel lists them later).
create table public.gig_reports (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (gig_id, reporter_id)
);
alter table public.gig_reports enable row level security;

create policy "users report a gig once"
  on public.gig_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "admins read reports"
  on public.gig_reports for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_admin
  ));
