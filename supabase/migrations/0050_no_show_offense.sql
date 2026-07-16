-- D-071 (dúvida 24 resolvida): furo repetido também suspende. Além da dívida
-- da taxa, cada furo registra um evento de integridade 'no_show'; a REINCIDÊNCIA
-- (2º furo em 30 dias) suspende a conta por 7 dias, como as demais penalidades
-- do anti-abuso C.

-- Permite o novo tipo de evento.
alter table public.integrity_events drop constraint if exists integrity_events_type_check;
alter table public.integrity_events add constraint integrity_events_type_check
  check (type in ('late_cancel', 'upheld_report', 'no_show'));

-- Adiciona o limiar do 'no_show' (2 = reincidência) ao contador de reincidência.
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
    when 'no_show' then 2
    else 1000000 end;

  if cnt >= thresh then
    until := now() + interval '7 days';
    perform public.apply_suspension(p_user, until);
  end if;
  return until;
end;
$$;

revoke all on function public.record_offense(uuid, text, uuid) from anon, authenticated;
