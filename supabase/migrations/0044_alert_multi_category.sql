-- Vinc — alertas por VÁRIAS categorias, ou TODAS (V-07). Troca a coluna única
-- category_id por category_ids (lista). Lista vazia = qualquer categoria.

alter table public.job_alerts add column category_ids uuid[] not null default '{}';

-- Preserva os alertas existentes (a categoria única vira uma lista de um item).
update public.job_alerts set category_ids = array[category_id] where category_id is not null;

alter table public.job_alerts drop column category_id;

-- Trigger de matching atualizado: casa se o alerta é "todas" (lista vazia), ou
-- a categoria da vaga está na lista, ou a categoria-pai da vaga está na lista.
create or replace function public.notify_job_alerts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  gig_dow smallint;
  gig_band text;
  gig_parent uuid;
begin
  if new.status <> 'open' then return new; end if;
  gig_dow := extract(dow from new.starts_at)::smallint;
  gig_band := case
    when extract(hour from new.starts_at) < 6 then 'madrugada'
    when extract(hour from new.starts_at) < 12 then 'manha'
    when extract(hour from new.starts_at) < 18 then 'tarde'
    else 'noite'
  end;
  select parent_id into gig_parent from public.categories where id = new.category_id;

  insert into public.notifications (user_id, gig_id, type)
  select distinct a.user_id, new.id, 'job_match'
  from public.job_alerts a
  where a.active
    and a.user_id <> new.poster_id
    and (
      cardinality(a.category_ids) = 0            -- todas as categorias
      or new.category_id = any (a.category_ids)  -- categoria exata
      or gig_parent = any (a.category_ids)       -- alerta na categoria-pai
    )
    and (cardinality(a.days) = 0 or gig_dow = any (a.days))
    and (cardinality(a.time_bands) = 0 or gig_band = any (a.time_bands))
    and (
      a.region_lat is null
      or (
        new.approx_lat is not null and new.approx_lng is not null
        and public.distance_km(a.region_lat, a.region_lng, new.approx_lat, new.approx_lng) <= a.radius_km
      )
    );
  return new;
end;
$$;
