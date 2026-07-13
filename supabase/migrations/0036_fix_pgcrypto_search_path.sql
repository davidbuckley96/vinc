-- Vinc — fix (D-046): pgcrypto vive no schema `extensions` no Supabase, então
-- as funções com search_path = public não achavam digest(). Recria as três
-- com `search_path = public, extensions`.

create or replace function public.enforce_cpf_registry()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function public.apply_suspension(p_user uuid, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function public.record_offense(p_user uuid, p_type text, p_gig uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
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
