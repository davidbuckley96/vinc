-- Vinc — Fase 2 bloco 2.4 (D-028): disputes and refunds
--
-- Two moments to contest (docs/02 §6):
--   pre_release  — instead of confirming, the poster disputes:
--                  awaiting_confirmation → disputed, freezing the escrow
--                  (the 48h auto-release only touches awaiting_confirmation).
--   post_release — within the 7-day processing hold (D-016) the poster
--                  opens a refund request; the payment freezes in the
--                  worker's wallet (derived — see core/wallet.ts).
-- Resolution (total or partial refund, capped at the service value; the
-- fee is never refunded) is decided by an ADMIN in the panel (block 2.5)
-- and executed by the resolve-dispute function. All writes go through
-- Edge Functions (service role) — clients can never move money.

-- ============================================================ gig status
alter table public.gigs drop constraint gigs_status_check;
alter table public.gigs add constraint gigs_status_check check (status in (
  'open', 'pending_approval', 'accepted', 'in_progress',
  'awaiting_confirmation', 'disputed', 'completed',
  'cancelled_by_poster', 'cancelled_by_worker', 'expired'
));

-- ============================================================ admin flag
-- Dispute analysis is done by the platform (David — D-028). Set by hand:
--   update profiles set is_admin = true where id = '<uuid>';
alter table public.profiles add column is_admin boolean not null default false;

-- ============================================================ disputes
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  -- One dispute per gig (mirrors D-020: a single refund operation).
  gig_id uuid not null unique references public.gigs (id),
  opener_id uuid not null references public.profiles (id),
  kind text not null check (kind in ('pre_release', 'post_release')),
  -- The written report is REQUIRED (D-028) and must say something.
  reason text not null check (char_length(reason) between 20 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  refund_cents integer check (refund_cents >= 0),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index disputes_status on public.disputes (status, created_at);

alter table public.disputes enable row level security;

-- Both parties follow their case; admins see the queue. Writes: functions.
create policy "participants and admins read disputes"
  on public.disputes for select to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

-- Up to 5 optional photos (D-028), stored in the private bucket below.
create table public.dispute_photos (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.dispute_photos enable row level security;

create policy "participants and admins read dispute photos"
  on public.dispute_photos for select to authenticated
  using (
    exists (
      select 1 from public.disputes d
      join public.gigs g on g.id = d.gig_id
      where d.id = dispute_id
        and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

-- ============================================================ storage
insert into storage.buckets (id, name, public)
  values ('dispute-photos', 'dispute-photos', false);

-- Uploads go into the uploader's own folder ({uid}/...); reads are for
-- the uploader, the other party of the linked dispute, and admins.
create policy "users upload their own dispute photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dispute-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "dispute parties and admins read dispute photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dispute-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.dispute_photos dp
        join public.disputes d on d.id = dp.dispute_id
        join public.gigs g on g.id = d.gig_id
        where dp.path = name
          and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
      )
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.is_admin
      )
    )
  );
