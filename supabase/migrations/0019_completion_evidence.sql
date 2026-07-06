-- Vinc — worker completion evidence + no-punishment layers (D-032)
--
-- Protects the worker from "old photo" scams (docs/02 §6): when
-- finishing, the worker may attach photos of the result + a short report
-- (optional, encouraged). The SERVER timestamp of the upload is the
-- evidence — photo EXIF dates are forgeable, upload times are not.
-- A worker whose evidence lands at completion time outweighs a poster
-- whose "proof" only appears when the dispute opens.
--
-- Layer 3 of D-032: if the worker's phone died and the poster vanished,
-- a job moves in_progress → awaiting_confirmation 12h after the
-- scheduled end, so the 48h auto-release clock (D-028) still starts and
-- the payment never gets stuck. The poster keeps the whole window to
-- confirm or dispute.

-- ============================================================ evidence
create table public.gig_completions (
  gig_id uuid primary key references public.gigs (id) on delete cascade,
  worker_id uuid not null references public.profiles (id),
  report text check (char_length(report) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.gig_completions enable row level security;

create policy "participants and admins read completion evidence"
  on public.gig_completions for select to authenticated
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

create table public.gig_completion_photos (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gig_completions (gig_id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);

alter table public.gig_completion_photos enable row level security;

create policy "participants and admins read completion photos"
  on public.gig_completion_photos for select to authenticated
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

-- ============================================================ storage
-- Same rules as dispute-photos: upload only into the own folder, parties
-- and admins read, NOBODY deletes — attached evidence is immutable.
insert into storage.buckets (id, name, public)
  values ('completion-photos', 'completion-photos', false);

create policy "workers upload their own completion photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'completion-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "parties and admins read completion photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'completion-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.gig_completion_photos cp
        join public.gigs g on g.id = cp.gig_id
        where cp.path = name
          and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
      )
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.is_admin
      )
    )
  );

-- ============================================================ layer 3 job
create or replace function public.auto_mark_awaiting()
returns integer
language sql
security definer
set search_path = public
as $$
  with marked as (
    update public.gigs
    set status = 'awaiting_confirmation', awaiting_since = now()
    where status = 'in_progress'
      and ends_at <= now() - interval '12 hours'
    returning id
  )
  select count(*)::integer from marked;
$$;

revoke execute on function public.auto_mark_awaiting() from public, anon, authenticated;

select cron.schedule('auto-mark-awaiting', '*/15 * * * *',
  'select public.auto_mark_awaiting()');
