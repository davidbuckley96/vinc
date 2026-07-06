-- Vinc — multiple candidates with anonymized choice (D-024, docs/02 §3)
-- The gig now STAYS OPEN collecting candidates; the poster chooses one.
-- gig_candidacies replaces both the pending_approval status (legacy) and
-- the gig_refusals table (a refusal is a candidacy with status refused).

create table public.gig_candidacies (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs (id) on delete cascade,
  worker_id uuid not null references public.profiles (id),
  status text not null default 'pending'
    check (status in ('pending', 'chosen', 'refused', 'not_chosen')),
  created_at timestamptz not null default now(),
  unique (gig_id, worker_id)
);

create index gig_candidacies_gig on public.gig_candidacies (gig_id, status);
create index gig_candidacies_worker on public.gig_candidacies (worker_id, status);

alter table public.gig_candidacies enable row level security;

-- Workers see their own candidacies (agenda / gig detail state). Posters
-- intentionally get NO select policy: candidate info reaches them only
-- through the get-candidates function, anonymized (D-024). Writes are
-- service-role only (apply-gig / decide-candidacy).
create policy "workers read their own candidacies"
  on public.gig_candidacies for select to authenticated
  using (worker_id = (select auth.uid()));

-- The search view depends on gig_refusals — drop it first (recreated below).
drop view public.visible_open_gigs;

-- Migrate permanent refusals, then retire the old table.
insert into public.gig_candidacies (gig_id, worker_id, status)
  select gig_id, worker_id, 'refused' from public.gig_refusals
  on conflict (gig_id, worker_id) do nothing;
drop table public.gig_refusals;

-- Any gig stuck in the legacy one-at-a-time flow reopens; the candidate
-- becomes a pending candidacy so nobody loses their place.
insert into public.gig_candidacies (gig_id, worker_id, status)
  select id, worker_id, 'pending' from public.gigs
  where status = 'pending_approval' and worker_id is not null
  on conflict (gig_id, worker_id) do nothing;
update public.gigs set status = 'open', worker_id = null
  where status = 'pending_approval';

-- Search view: refusal filter now reads gig_candidacies.
create view public.visible_open_gigs
with (security_invoker = on) as
select
  g.id, g.poster_id, g.category_id, g.title, g.description,
  g.starts_at, g.ends_at, g.price_cents, g.address, g.lat, g.lng,
  g.created_at, p.name as poster_name
from public.gigs g
join public.profiles p on p.id = g.poster_id
where g.status = 'open'
  and g.starts_at > now()
  and not exists (
    select 1 from public.gig_candidacies c
    where c.gig_id = g.id
      and c.worker_id = (select auth.uid())
      and c.status = 'refused'
  )
  and not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = g.poster_id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = g.poster_id)
  );
