-- Vinc — Fase 2 bloco 2.7 (D-034): priority for workers harmed by a
-- poster cancellation
--
-- The fine (D-018) compensates the money; the priority compensates the
-- TIME: the worker gets priority on candidacies to gigs that OVERLAP the
-- cancelled service's period — refilling exactly the hole opened in
-- their agenda. Scoping it to the period keeps priority scarce (David:
-- a broad N-day priority would inflate away; per-user priority may
-- become a PREMIUM feature later). Windows in the past never match
-- future gigs, so priority expires by itself.

create table public.priority_windows (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id) on delete cascade,
  source_gig_id uuid not null unique references public.gigs (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index priority_windows_worker on public.priority_windows (worker_id, ends_at);

alter table public.priority_windows enable row level security;

-- The worker sees their own priority ("você tem prioridade nesta vaga");
-- posters never query this directly — get-candidates flags the cards.
create policy "workers read their own priority windows"
  on public.priority_windows for select to authenticated
  using (worker_id = (select auth.uid()));

-- Created automatically when a poster cancels an active service.
create or replace function public.record_priority_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled_by_poster'
     and old.status in ('accepted', 'in_progress')
     and new.worker_id is not null then
    insert into priority_windows (worker_id, source_gig_id, starts_at, ends_at)
      values (new.worker_id, new.id, new.starts_at, new.ends_at)
      on conflict (source_gig_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger record_priority_window
  after update of status on public.gigs
  for each row execute function public.record_priority_window();
