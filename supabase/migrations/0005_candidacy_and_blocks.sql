-- Vinc — candidacy-with-approval flow and user blocking (D-012)
-- docs/02 §3 (Uber-like candidacy) and §8 (blocking).

-- ============================================================ gig status
-- New status: pending_approval (a worker applied; gig is locked; the poster
-- must approve or refuse). worker_id holds the candidate while pending.
alter table public.gigs drop constraint gigs_status_check;
alter table public.gigs add constraint gigs_status_check check (status in (
  'open', 'pending_approval', 'accepted', 'in_progress',
  'awaiting_confirmation', 'completed',
  'cancelled_by_poster', 'cancelled_by_worker', 'expired'
));

-- ============================================================ refusals
-- A refused candidate can never see or re-apply to THAT gig (docs/02 §3).
-- Refusals are per-gig only and never expire.
create table public.gig_refusals (
  gig_id uuid not null references public.gigs (id),
  worker_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (gig_id, worker_id)
);

alter table public.gig_refusals enable row level security;

-- The refused worker must be able to know (to filter listings); the poster
-- may see their gig's refusals. Writes: service role only.
create policy "involved users read refusals"
  on public.gig_refusals for select to authenticated
  using (
    worker_id = (select auth.uid())
    or exists (
      select 1 from public.gigs g
      where g.id = gig_id and g.poster_id = (select auth.uid())
    )
  );

-- ============================================================ blocks
-- Blocking works both ways (docs/02 §8): neither side sees the other's
-- gigs nor can apply; messaging (future) is cut too.
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id),
  blocked_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

-- Both sides need visibility to enforce the effects client-side; only the
-- blocker manages their own blocks.
create policy "involved users read blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));

create policy "users create their own blocks"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "users remove their own blocks"
  on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- ============================================================ visible gigs
-- Listing view: open future gigs minus refused-for-me and blocked pairs.
-- security_invoker keeps RLS; poster name inlined for simple selects.
create view public.visible_open_gigs
with (security_invoker = on) as
select
  g.id, g.poster_id, g.category_id, g.title, g.description,
  g.starts_at, g.ends_at, g.price_cents, g.address, g.created_at,
  p.name as poster_name
from public.gigs g
join public.profiles p on p.id = g.poster_id
where g.status = 'open'
  and g.starts_at > now()
  and not exists (
    select 1 from public.gig_refusals r
    where r.gig_id = g.id and r.worker_id = (select auth.uid())
  )
  and not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = g.poster_id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = g.poster_id)
  );
