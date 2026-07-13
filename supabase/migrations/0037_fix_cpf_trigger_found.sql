-- Vinc — fix (D-046): no trigger de CPF, o FOUND era sobrescrito pelo
-- INSERT ... ON CONFLICT DO NOTHING (0 linhas → FOUND=false), pulando a
-- herança da suspensão. Captura o estado num booleano antes do insert.

create or replace function public.enforce_cpf_registry()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h text := encode(digest(new.holder_cpf, 'sha256'), 'hex');
  reg public.cpf_registry%rowtype;
  has_reg boolean;
begin
  select * into reg from public.cpf_registry where cpf_hash = h;
  has_reg := found;

  if has_reg and reg.banned then
    raise exception 'CPF_BANNED' using errcode = 'check_violation';
  end if;

  insert into public.cpf_registry (cpf_hash) values (h) on conflict (cpf_hash) do nothing;

  if has_reg and reg.suspended_until is not null and reg.suspended_until > now() then
    update public.profiles
      set suspended_until = greatest(coalesce(suspended_until, reg.suspended_until), reg.suspended_until)
      where id = new.user_id;
  end if;
  return new;
end;
$$;
