-- Vinc — Fase 2 bloco 2.3 (D-028): approximate address before the choice
--
-- Candidates must see only an AREA label ("Boa Vista, Recife") and a
-- fuzzed pin; the exact address belongs to the poster and the CHOSEN
-- worker. gigs is world-readable, so — like the check-in code — the
-- exact location moves to its own table guarded by RLS, and gigs keeps
-- only the approximate fields.

-- Exact location, readable only by the poster and the assigned worker.
create table public.gig_addresses (
  gig_id uuid primary key references public.gigs (id) on delete cascade,
  address text not null,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now()
);

alter table public.gig_addresses enable row level security;

create policy "participants read the exact address"
  on public.gig_addresses for select to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
    )
  );

insert into public.gig_addresses (gig_id, address, lat, lng)
  select id, address, lat, lng from public.gigs;

-- Approximate fields everyone may see. Labels follow the geocoder format
-- "street, number — area, city": the public part is what follows the "—".
alter table public.gigs
  add column area text,
  add column approx_lat double precision check (approx_lat between -90 and 90),
  add column approx_lng double precision check (approx_lng between -180 and 180);

update public.gigs
  set area = coalesce(nullif(trim(split_part(address, ' — ', 2)), ''), 'Região aproximada no mapa');

-- One-time random 250–600 m offset (stored so it can't be averaged out).
update public.gigs g
  set approx_lat = f.alat, approx_lng = f.alng
from (
  select id,
    lat + (dist * sin(theta)) / 111320.0 as alat,
    lng + (dist * cos(theta)) / greatest(111320.0 * cos(radians(lat)), 1) as alng
  from (
    select id, lat, lng,
      250 + random() * 350 as dist,
      random() * 2 * pi() as theta
    from public.gigs
    where lat is not null and lng is not null
  ) r
) f
where g.id = f.id;

alter table public.gigs alter column area set not null;

-- The exact columns leave gigs; the view moves to the approximate ones.
drop view public.visible_open_gigs;
alter table public.gigs drop column address, drop column lat, drop column lng;

create view public.visible_open_gigs
with (security_invoker = on) as
select
  g.id, g.poster_id, g.category_id, g.title, g.description,
  g.starts_at, g.ends_at, g.price_cents, g.area, g.approx_lat, g.approx_lng,
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
