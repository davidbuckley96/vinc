-- Vinc — Fase 3.3 (D-035): receiver onboarding
--
-- The worker registers a Pix key (and the account holder's CPF) before
-- the first real payout. In model A this feeds the provider subaccount
-- creation (external_account_id, filled by the adapter when the real
-- sandbox/production onboarding lands); until then it gates the
-- withdraw so nobody reaches a payout without a destination.

create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pix_key_type text not null check (pix_key_type in ('cpf', 'phone', 'email', 'random')),
  pix_key text not null check (char_length(pix_key) between 5 and 120),
  holder_cpf text not null check (holder_cpf ~ '^[0-9]{11}$'),
  status text not null default 'pending' check (status in ('pending', 'verified')),
  external_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

create policy "users read their own payout account"
  on public.payout_accounts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users create their own payout account"
  on public.payout_accounts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update their own payout account"
  on public.payout_accounts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Clients edit only the key fields; status and the provider's account id
-- belong to the platform (service role).
revoke insert, update on public.payout_accounts from authenticated;
grant insert (user_id, pix_key_type, pix_key, holder_cpf)
  on public.payout_accounts to authenticated;
-- user_id included so PostgREST upserts work (ON CONFLICT DO UPDATE
-- touches every inserted column); RLS still pins rows to the owner.
grant update (user_id, pix_key_type, pix_key, holder_cpf)
  on public.payout_accounts to authenticated;

create or replace function public.touch_payout_account()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  -- Changing the key resets any future provider verification; other
  -- updates (e.g. the platform marking it verified) keep the status.
  if new.pix_key is distinct from old.pix_key
     or new.pix_key_type is distinct from old.pix_key_type
     or new.holder_cpf is distinct from old.holder_cpf then
    new.status = 'pending';
  end if;
  return new;
end;
$$;

create trigger touch_payout_account
  before update on public.payout_accounts
  for each row execute function public.touch_payout_account();
