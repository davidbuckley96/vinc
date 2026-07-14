-- Vinc — alertas de vaga (B-30 fatia 3, D-064). O usuário salva alertas
-- (serviço + dias + faixa de horário + região) e é avisado quando surge uma
-- vaga que combina — notificação in-app (sino) e push (D-047).

create table public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  -- Dias da semana (0=domingo … 6=sábado); vazio = qualquer dia.
  days smallint[] not null default '{}',
  -- Faixas do dia: 'madrugada'(0-5) 'manha'(6-11) 'tarde'(12-17) 'noite'(18-23);
  -- vazio = qualquer horário.
  time_bands text[] not null default '{}',
  -- Região opcional (nulo = qualquer lugar). Só o ponto+raio, nunca endereço.
  region_lat double precision check (region_lat between -90 and 90),
  region_lng double precision check (region_lng between -180 and 180),
  radius_km integer not null default 30 check (radius_km between 1 and 500),
  region_label text,
  push_enabled boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index job_alerts_user on public.job_alerts (user_id);
create index job_alerts_active_category on public.job_alerts (category_id) where active;

alter table public.job_alerts enable row level security;

create policy "users manage their own alerts"
  on public.job_alerts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Distância em km (haversine) — usada pelo matching dos alertas.
create function public.distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable
set search_path = ''
as $$
  select 6371 * acos(
    least(1, greatest(-1,
      sin(radians(lat1)) * sin(radians(lat2))
      + cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2 - lng1))
    ))
  );
$$;

-- Nova notificação: uma vaga combinou com um alerta.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'new_candidate', 'chosen', 'not_chosen',
  'service_started', 'service_completed', 'payment_released',
  'dispute_opened', 'dispute_resolved',
  'cancelled_by_poster', 'cancelled_by_worker', 'gig_expired',
  'job_match'
));

-- Ao publicar uma vaga aberta, avisa quem tem um alerta que combina. Roda como
-- owner (security definer) para inserir notificações de OUTROS usuários e ler
-- todos os alertas — o RLS bloquearia. `distinct` garante um aviso por vaga
-- mesmo que o usuário tenha vários alertas que combinem.
create function public.notify_job_alerts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  gig_dow smallint;
  gig_band text;
  gig_parent uuid;
begin
  if new.status <> 'open' then
    return new;
  end if;
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
    and (a.category_id = new.category_id or a.category_id = gig_parent)
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

create trigger on_gig_created_notify_alerts
  after insert on public.gigs
  for each row execute function public.notify_job_alerts();
