-- D-071: worker no-show ("furo"). When the chosen worker never starts the
-- service, the poster free-cancels with a FULL refund (net + the 10% fee that
-- is normally kept). The refunded fee becomes a DEBT owed by the no-show
-- worker, collected from future earnings (≤50% of each completed job's net so
-- the worker always keeps at least half).

-- Flag the gig as a no-show so history can label it distinctly from a normal
-- worker cancellation (the status is still cancelled_by_worker — the fault is
-- the worker's — but the reason differs).
alter table public.gigs
  add column if not exists worker_no_show boolean not null default false;

-- Accumulating debts. One row per no-show; remaining_cents shrinks as future
-- payouts are seized, and status flips to 'settled' at zero (or 'voided' when
-- support rules for the worker in a dispute).
create table if not exists public.worker_debts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id),
  -- The gig whose no-show created the debt (transparency, D-071): the worker
  -- opens THIS gig from history to see why they owe and to contest.
  gig_id uuid not null references public.gigs (id),
  amount_cents integer not null check (amount_cents > 0),
  remaining_cents integer not null check (remaining_cents >= 0),
  status text not null default 'open' check (status in ('open', 'settled', 'voided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only ONE debt per gig — the no-show cancel is a single, idempotent event.
create unique index if not exists worker_debts_gig_uniq on public.worker_debts (gig_id);
create index if not exists worker_debts_open
  on public.worker_debts (worker_id, created_at)
  where status = 'open';

alter table public.worker_debts enable row level security;

-- The worker reads their own debts (wallet/history); ONLY the service role
-- writes (no-show-cancel + the release collection), so debts can't be forged
-- or cleared by clients.
drop policy if exists "workers read their own debts" on public.worker_debts;
create policy "workers read their own debts"
  on public.worker_debts for select to authenticated
  using (worker_id = (select auth.uid()));

-- New ledger movement: the slice of a payout seized to repay a no-show debt
-- (a negative entry on the worker, mirroring how the self-cancel fine is
-- recorded). Extends the existing type check.
alter table public.ledger_entries drop constraint if exists ledger_entries_type_check;
alter table public.ledger_entries add constraint ledger_entries_type_check
  check (type in (
    'escrow_hold', 'escrow_release', 'fee', 'fine', 'refund', 'withdrawal',
    'debt_repayment'
  ));
