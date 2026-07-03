-- Vinc — allow deleting a gig that never had a worker (Fase 1, D-017)
-- The old invariant said: worker_id IS NULL exactly when status is
-- open/expired. Deletion (D-013) moves open → cancelled_by_poster with no
-- worker ever assigned, which that constraint forbade. New invariant:
--   open/expired            → no worker
--   cancelled_by_poster     → worker optional (deleted before/with a
--                             pending candidate: none/kept for history;
--                             cancelled after approval: kept)
--   every other status      → worker required

alter table public.gigs drop constraint gigs_check1;
alter table public.gigs add constraint gigs_worker_presence_check check (
  case
    when status in ('open', 'expired') then worker_id is null
    when status = 'cancelled_by_poster' then true
    else worker_id is not null
  end
);
