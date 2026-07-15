-- Vinc — endurecimento do match de alertas (docs/13 · B1/B2).
--
-- B2: a migração 0044 trocou `category_id` por `category_ids uuid[]` e, ao
-- derrubar a coluna antiga, levou junto o índice `job_alerts_active_category`.
-- Sem índice, `notify_job_alerts` fazia um SEQ SCAN de todos os alertas ativos
-- a cada vaga criada (com haversine por linha). Recriamos um índice GIN parcial
-- e reescrevemos o predicado de categoria em forma de contenção (`@>`), que o
-- GIN consegue usar.
create index if not exists job_alerts_active_categories
  on public.job_alerts using gin (category_ids)
  where active;

-- B1: o match roda AFTER INSERT na MESMA transação da vaga. Sem guarda, qualquer
-- exceção (coluna errada, banda inválida, falha de rede num dispatch etc.) fazia
-- ROLLBACK da vaga inteira — exatamente o que já quebrou a criação de vagas uma
-- vez. Agora o corpo do match roda dentro de um bloco que captura QUALQUER erro
-- e apenas emite um WARNING: a vaga é sempre criada; no pior caso alguém deixa
-- de receber a notificação (recuperável), em vez de a publicação falhar.
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
        cardinality(a.category_ids) = 0                     -- todas as categorias
        or a.category_ids @> array[new.category_id]         -- categoria exata (GIN)
        or (gig_parent is not null and a.category_ids @> array[gig_parent])
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
  exception when others then
    -- Nunca deixa a notificação derrubar a criação da vaga.
    raise warning 'notify_job_alerts falhou para a vaga %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
