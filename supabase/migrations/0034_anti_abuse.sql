-- Vinc — Anti-abuso (D-046): CPF único à prova de recriação + suspensão
-- automática por reincidência.
--
-- B) CPF obrigatório e ÚNICO: uma conta ativa por CPF (índice único) e um
--    REGISTRO de CPF (hash) que SOBREVIVE à exclusão da conta, guardando
--    banimento/suspensão — assim deletar e recriar a conta não burla a
--    regra: a conta nova herda a suspensão vigente do CPF.
-- C) Suspensão por reincidência: eventos de integridade + suspended_until;
--    3 cancelamentos de última hora em 30d OU 2 denúncias procedentes em
--    30d → 7 dias sem publicar/se candidatar (prazos em packages/core).

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ suspensão (perfil)
alter table public.profiles add column suspended_until timestamptz;

-- --------------------------------------------------------- eventos de integridade
create table public.integrity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('late_cancel', 'upheld_report')),
  gig_id uuid references public.gigs (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.integrity_events enable row level security;
create index integrity_events_user on public.integrity_events (user_id, type, created_at desc);

create policy "admins read integrity events"
  on public.integrity_events for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin
  ));
-- Writes are service-role only (edge functions), so offenses can't be forged.

-- ------------------------------------------------- registro de CPF (sobrevive à conta)
-- Guarda apenas o HASH do CPF (privacidade/LGPD) + penalidades. Sem FK a
-- profiles: a linha permanece mesmo após a conta ser excluída.
create table public.cpf_registry (
  cpf_hash text primary key,
  first_seen timestamptz not null default now(),
  suspended_until timestamptz,
  banned boolean not null default false
);
alter table public.cpf_registry enable row level security;
-- Sem policies: acesso só pelo service role / funções security definer.

-- Uma conta ATIVA por CPF (a exclusão libera a linha, mas o registro acima
-- mantém as penalidades).
create unique index payout_accounts_cpf_unique on public.payout_accounts (holder_cpf);

-- ------------------------------------------------------------ trigger de CPF
-- No cadastro/edição do CPF: veta CPF banido, registra o hash e faz a conta
-- HERDAR a suspensão vigente do CPF (recriar não escapa).
create or replace function public.enforce_cpf_registry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h text := encode(digest(new.holder_cpf, 'sha256'), 'hex');
  reg public.cpf_registry%rowtype;
begin
  select * into reg from public.cpf_registry where cpf_hash = h;
  if found and reg.banned then
    raise exception 'CPF_BANNED' using errcode = 'check_violation';
  end if;

  insert into public.cpf_registry (cpf_hash) values (h) on conflict (cpf_hash) do nothing;

  if found and reg.suspended_until is not null and reg.suspended_until > now() then
    update public.profiles
      set suspended_until = greatest(coalesce(suspended_until, reg.suspended_until), reg.suspended_until)
      where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger enforce_cpf_registry_trg
  before insert or update of holder_cpf on public.payout_accounts
  for each row execute function public.enforce_cpf_registry();

-- --------------------------------------------------------- aplicar suspensão
-- Suspende a conta E grava no registro do CPF (para valer após recriação).
create or replace function public.apply_suspension(p_user uuid, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare h text;
begin
  update public.profiles
    set suspended_until = greatest(coalesce(suspended_until, p_until), p_until)
    where id = p_user;

  select encode(digest(holder_cpf, 'sha256'), 'hex') into h
    from public.payout_accounts where user_id = p_user;
  if h is not null then
    insert into public.cpf_registry (cpf_hash, suspended_until) values (h, p_until)
      on conflict (cpf_hash) do update
        set suspended_until = greatest(coalesce(public.cpf_registry.suspended_until, excluded.suspended_until), excluded.suspended_until);
  end if;
end;
$$;

-- ------------------------------------------ registrar ofensa e talvez suspender
-- Retorna o fim da suspensão quando o limiar é cruzado, senão null.
create or replace function public.record_offense(p_user uuid, p_type text, p_gig uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare cnt int; thresh int; until timestamptz := null;
begin
  insert into public.integrity_events (user_id, type, gig_id) values (p_user, p_type, p_gig);

  select count(*) into cnt from public.integrity_events
    where user_id = p_user and type = p_type and created_at > now() - interval '30 days';

  thresh := case p_type
    when 'late_cancel' then 3
    when 'upheld_report' then 2
    else 1000000 end;

  if cnt >= thresh then
    until := now() + interval '7 days';
    perform public.apply_suspension(p_user, until);
  end if;
  return until;
end;
$$;

revoke all on function public.record_offense(uuid, text, uuid) from anon, authenticated;
revoke all on function public.apply_suspension(uuid, timestamptz) from anon, authenticated;
