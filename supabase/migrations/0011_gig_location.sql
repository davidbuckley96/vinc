-- Vinc — map location on gigs (docs/02 §2.1, D-023)
-- The poster picks the spot on a map (option A, round 7): lat/lng store
-- the pin; address stays as the human-readable label (reverse geocoded).
-- Nullable during rollout — gigs created before the map have no pin.

alter table public.gigs
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

-- Recreate the listing view including the pin.
drop view public.visible_open_gigs;
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
    select 1 from public.gig_refusals r
    where r.gig_id = g.id and r.worker_id = (select auth.uid())
  )
  and not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = g.poster_id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = g.poster_id)
  );
