-- Vinc — service lifecycle + simulated wallet ledger (Fase 1 MVP)
-- docs/02 §4 (execution/confirmation) and §5 (payments/escrow).

-- ============================================================ gig status
-- New status: awaiting_confirmation (worker finished, poster must confirm;
-- confirmation releases the escrowed payment).
alter table public.gigs drop constraint gigs_status_check;
alter table public.gigs add constraint gigs_status_check check (status in (
  'open', 'accepted', 'in_progress', 'awaiting_confirmation', 'completed',
  'cancelled_by_poster', 'cancelled_by_worker', 'expired'
));

-- ============================================================ ledger
-- Immutable financial ledger (docs/03 principle 4): rows are only inserted,
-- never updated or deleted; balances are always derived. Amounts are signed
-- integer cents: negative = money leaves the user, positive = money enters.
-- MVP simulation note: poster balances may go negative (no real charge yet);
-- the real payment gateway lands in Fase 3.
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  gig_id uuid references public.gigs (id),
  type text not null check (type in (
    'escrow_hold', 'escrow_release', 'fee', 'fine', 'refund', 'withdrawal'
  )),
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

create index ledger_entries_user on public.ledger_entries (user_id, created_at desc);
create index ledger_entries_gig on public.ledger_entries (gig_id);

alter table public.ledger_entries enable row level security;

-- Users read their own entries; ONLY the service role writes (edge
-- functions), so clients can never fabricate money.
create policy "users read their own ledger"
  on public.ledger_entries for select to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policies for authenticated: writes are service-role only.
