-- Vinc — automatic gig expiration with refund (Fase 1, D-022)
-- A gig that reaches its START time with nobody approved (still open or
-- with an undecided pending candidate) can no longer happen: it expires
-- and the worker amount goes back to the poster — the creation fee stays
-- with the platform (docs/02 §5.1). Runs inside the database via pg_cron
-- every 5 minutes; the search view already hides started gigs, so users
-- never see a stale listing even between runs.

create extension if not exists pg_cron;

create or replace function public.expire_due_gigs()
returns integer
language sql
security definer
set search_path = public
as $$
  with expired as (
    -- worker_id cleared: the pending candidate (if any) was never
    -- approved, and the expired status requires no worker (0008)
    update public.gigs
    set status = 'expired', worker_id = null
    where status in ('open', 'pending_approval')
      and starts_at <= now()
    returning id, poster_id, price_cents
  ),
  refunds as (
    insert into public.ledger_entries (user_id, gig_id, type, amount_cents)
    select poster_id, id, 'refund', price_cents from expired
  )
  select count(*)::integer from expired;
$$;

-- Only the cron job (postgres) should call this.
revoke execute on function public.expire_due_gigs() from public, anon, authenticated;

select cron.schedule('expire-due-gigs', '*/5 * * * *', 'select public.expire_due_gigs()');
