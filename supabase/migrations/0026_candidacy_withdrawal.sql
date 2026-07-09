-- Vinc — D-039: worker can withdraw a pending candidacy (no penalty) and
-- re-apply while the gig is open. To keep the poster's inbox clean, at
-- most ONE unread "new candidate" notification exists per gig — re-
-- applying (or a second candidate) while the first is unread adds nothing.

alter table public.gig_candidacies
  drop constraint gig_candidacies_status_check;
alter table public.gig_candidacies
  add constraint gig_candidacies_status_check
  check (status in ('pending', 'chosen', 'refused', 'not_chosen', 'withdrawn'));

-- Re-apply (withdrawn → pending) notifies like a fresh candidacy, but
-- both paths skip the insert while an UNREAD new_candidate notification
-- for the gig exists (D-039 anti-spam). Withdrawing notifies nobody.
create or replace function public.notify_candidacy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gig_poster uuid;
begin
  if (tg_op = 'INSERT' and new.status = 'pending')
     or (tg_op = 'UPDATE' and old.status = 'withdrawn' and new.status = 'pending') then
    select poster_id into gig_poster from gigs where id = new.gig_id;
    if not exists (
      select 1 from notifications
      where user_id = gig_poster
        and gig_id = new.gig_id
        and type = 'new_candidate'
        and read_at is null
    ) then
      insert into notifications (user_id, gig_id, type)
        values (gig_poster, new.gig_id, 'new_candidate');
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'chosen' then
      insert into notifications (user_id, gig_id, type)
        values (new.worker_id, new.gig_id, 'chosen');
    elsif new.status = 'not_chosen' then
      insert into notifications (user_id, gig_id, type)
        values (new.worker_id, new.gig_id, 'not_chosen');
    end if;
  end if;
  return new;
end;
$$;
