-- Vinc — in-app messages between the parties of a linked service
-- (Fase 1 MVP, docs/02 §8: blocking cuts messaging). One thread per gig,
-- between the poster and the CHOSEN worker — never during the anonymized
-- candidacy phase (D-024). Clients read/write directly under RLS; no
-- money or state moves here, so no edge function is needed.

create table public.gig_messages (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index gig_messages_gig on public.gig_messages (gig_id, created_at);

alter table public.gig_messages enable row level security;

-- Reading: only the two participants of the gig, ever.
create policy "participants read their gig messages"
  on public.gig_messages for select to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
    )
  );

-- Sending: participants only, while the service is linked (chosen worker
-- through completion) and with no block in either direction (§8).
create policy "participants send messages while linked"
  on public.gig_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
        and g.worker_id is not null
        and g.status in ('accepted', 'in_progress', 'awaiting_confirmation', 'completed')
    )
    and not exists (
      select 1
      from public.user_blocks b
      join public.gigs g on g.id = gig_id
      where (b.blocker_id = g.poster_id and b.blocked_id = g.worker_id)
         or (b.blocker_id = g.worker_id and b.blocked_id = g.poster_id)
    )
  );

-- Messages are immutable (like the ledger): no update/delete policies.

-- Live delivery via Supabase Realtime (RLS still applies per subscriber).
alter publication supabase_realtime add table public.gig_messages;
