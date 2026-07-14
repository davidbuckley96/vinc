-- B-25 (D-060): não deixar editar o conteúdo de uma vaga (horário, local,
-- categoria, título, descrição) quando já há candidaturas ativas (pendentes
-- ou escolhido). Reforço no banco, além do check no edge function update-gig
-- (que dá a mensagem específica). Mudanças de status/worker feitas pelo
-- sistema não tocam esses campos, então não disparam o bloqueio.
create or replace function public.block_edit_with_candidates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.starts_at is distinct from old.starts_at
      or new.ends_at is distinct from old.ends_at
      or new.area is distinct from old.area
      or new.approx_lat is distinct from old.approx_lat
      or new.approx_lng is distinct from old.approx_lng
      or new.category_id is distinct from old.category_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description)
     and exists (
       select 1 from public.gig_candidacies c
       where c.gig_id = old.id and c.status in ('pending', 'chosen')
     ) then
    raise exception 'gig_has_candidates'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists block_edit_with_candidates on public.gigs;
create trigger block_edit_with_candidates
  before update on public.gigs
  for each row execute function public.block_edit_with_candidates();
