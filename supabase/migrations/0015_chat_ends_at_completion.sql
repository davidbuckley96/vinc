-- Vinc — the conversation ENDS when the service ends (D-026)
-- David, 2026-07-06: after completion the parties must not keep talking
-- through the app. Sending is now allowed only while the service is
-- underway (accepted/in_progress/awaiting_confirmation). History stays
-- readable for both (record for disputes, §6) — only sending is cut.

drop policy "participants send messages while linked" on public.gig_messages;

create policy "participants send messages while underway"
  on public.gig_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and (g.poster_id = (select auth.uid()) or g.worker_id = (select auth.uid()))
        and g.worker_id is not null
        and g.status in ('accepted', 'in_progress', 'awaiting_confirmation')
    )
    and not exists (
      select 1
      from public.user_blocks b
      join public.gigs g on g.id = gig_id
      where (b.blocker_id = g.poster_id and b.blocked_id = g.worker_id)
         or (b.blocker_id = g.worker_id and b.blocked_id = g.poster_id)
    )
  );
