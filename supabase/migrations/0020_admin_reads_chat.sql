-- Vinc — Fase 2 bloco 2.5 (D-028): the admin panel shows the chat
--
-- Dispute analysis considers the conversation (docs/02 §6): messages are
-- already immutable and participants-only; admins gain READ access (never
-- write — the platform is not a participant).

create policy "admins read gig messages"
  on public.gig_messages for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

-- The panel also shows whether the service started via check-in code.
create policy "admins read check-in codes"
  on public.gig_checkin_codes for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );
