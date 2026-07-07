-- Vinc — Fase 3.2 (D-035): real Pix charge at gig creation
--
-- Gateway mode: the gig is created as PENDING_PAYMENT with a dynamic
-- Pix QR; the provider webhook confirms the payment, the ledger entries
-- are written then, and the gig publishes. The simulated provider
-- confirms instantly, so MVP behaviour is unchanged. Unpaid gigs expire
-- after 1h with NO refund — nothing was charged.

alter table public.gigs drop constraint gigs_status_check;
alter table public.gigs add constraint gigs_status_check check (status in (
  'pending_payment', 'open', 'pending_approval', 'accepted', 'in_progress',
  'awaiting_confirmation', 'disputed', 'completed',
  'cancelled_by_poster', 'cancelled_by_worker', 'expired'
));

alter table public.gigs drop constraint gigs_worker_presence_check;
alter table public.gigs add constraint gigs_worker_presence_check check (
  case
    when status in ('pending_payment', 'open', 'expired') then worker_id is null
    when status = 'cancelled_by_poster' then true
    else worker_id is not null
  end
);

-- One charge per gig; the poster follows their own payment (QR data).
create table public.gig_payments (
  gig_id uuid primary key references public.gigs (id) on delete cascade,
  provider text not null,
  charge_id text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired')),
  amount_total_cents integer not null check (amount_total_cents > 0),
  qr_code text,
  qr_code_base64 text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.gig_payments enable row level security;

create policy "posters read their gig payments"
  on public.gig_payments for select to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id and g.poster_id = (select auth.uid())
    )
  );

-- Unpaid gigs disappear quietly (no money moved, no refund entries).
create or replace function public.expire_unpaid_gigs()
returns integer
language sql
security definer
set search_path = public
as $$
  with expired as (
    update public.gigs
    set status = 'expired'
    where status = 'pending_payment'
      and created_at <= now() - interval '1 hour'
    returning id
  ),
  charges as (
    update public.gig_payments
    set status = 'expired'
    where gig_id in (select id from expired) and status = 'pending'
  )
  select count(*)::integer from expired;
$$;

revoke execute on function public.expire_unpaid_gigs() from public, anon, authenticated;

select cron.schedule('expire-unpaid-gigs', '*/15 * * * *',
  'select public.expire_unpaid_gigs()');

-- ============================================================ TEST ONLY
-- State for the Mercado Pago TEST DOUBLE (mp-mock Edge Function): same
-- API surface, fake money. DROP this table and the mp-mock function
-- before production (pre-launch checklist).
create table public.mp_mock_payments (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid,
  amount_cents integer not null,
  status text not null default 'pending',
  refunded_cents integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.mp_mock_payments enable row level security;
-- service role only (no policies): clients never touch the mock state.
