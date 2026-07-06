-- Vinc — per-user read marks for gig conversations (docs/02 §9)
-- Powers the "new message" badge: unread = counterpart messages newer
-- than my last_read_at. One row per (gig, user), upserted when the chat
-- opens. Users only ever touch their own marks.

create table public.gig_message_reads (
  gig_id uuid not null references public.gigs (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  last_read_at timestamptz not null default now(),
  primary key (gig_id, user_id)
);

alter table public.gig_message_reads enable row level security;

create policy "users manage their own read marks"
  on public.gig_message_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
