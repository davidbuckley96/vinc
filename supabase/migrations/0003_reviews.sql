-- Vinc — mutual reviews and reputation (docs/02 §7)
-- Reviews only after a completed gig, one per reviewer per gig, both
-- directions (poster reviews worker and vice-versa). Reputation is always
-- derived — never stored/editable directly.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs (id),
  reviewer_id uuid not null references public.profiles (id),
  reviewee_id uuid not null references public.profiles (id),
  -- reviewee's role in the gig, for per-role reputation display
  reviewee_role text not null check (reviewee_role in ('worker', 'poster')),
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (gig_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index reviews_reviewee on public.reviews (reviewee_id, created_at desc);

alter table public.reviews enable row level security;

-- Reputation is public inside the app (docs/01: trust is the core).
create policy "reviews are readable by authenticated users"
  on public.reviews for select to authenticated using (true);

-- A participant of a COMPLETED gig may review the counterpart, once
-- (unique constraint). The pair reviewer/reviewee must match the gig's
-- poster/worker so ratings can't be fabricated.
create policy "participants review the counterpart of completed gigs"
  on public.reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and g.status = 'completed'
        and (
          (g.poster_id = reviewer_id and g.worker_id = reviewee_id
            and reviewee_role = 'worker')
          or
          (g.worker_id = reviewer_id and g.poster_id = reviewee_id
            and reviewee_role = 'poster')
        )
    )
  );

-- No update/delete: reviews are immutable (anti-manipulation, docs/02 §7).

-- Derived reputation, one row per profile (security_invoker keeps RLS of
-- the underlying tables).
create view public.profile_stats
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.avatar_url,
  (select round(avg(r.rating)::numeric, 2) from public.reviews r
    where r.reviewee_id = p.id) as avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id) as review_count,
  (select round(avg(r.rating)::numeric, 2) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'worker') as worker_avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'worker') as worker_review_count,
  (select round(avg(r.rating)::numeric, 2) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'poster') as poster_avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'poster') as poster_review_count,
  (select count(*) from public.gigs g
    where g.worker_id = p.id and g.status = 'completed') as completed_as_worker,
  (select count(*) from public.gigs g
    where g.poster_id = p.id and g.status = 'completed') as completed_as_poster
from public.profiles p;
