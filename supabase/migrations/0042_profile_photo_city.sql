-- Vinc — perfil rico (B-30, D-064): cidade e foto de perfil.
--
-- `city` é texto PÚBLICO (aparece no perfil), então passa pela Edge Function
-- update-profile (containsContactInfo), igual a name/bio — não recebe grant
-- direto ao cliente. O `avatar_url` já é gravável pelo cliente (migração 0035);
-- a foto em si mora no bucket público `avatars` criado aqui.

alter table public.profiles add column if not exists city text;

-- Recria a view de reputação incluindo a cidade (perfil próprio e público).
drop view if exists public.profile_stats;
create view public.profile_stats
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.avatar_url,
  p.city,
  (select round(avg(r.rating)::numeric, 2) from public.reviews r
    where r.reviewee_id = p.id) as avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id) as review_count,
  (select round(avg(r.rating)::numeric, 2) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'worker') as worker_avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'worker') as worker_review_count,
  (select round(avg(r.rating)::numeric, 2) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'poster') as poster_avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'poster') as poster_review_count,
  (select count(*) from public.gigs g
    where g.worker_id = p.id and g.status = 'completed') as completed_as_worker,
  (select count(*) from public.gigs g
    where g.poster_id = p.id and g.status = 'completed') as completed_as_poster
from public.profiles p;

-- Bucket público das fotos de perfil: leitura por todos, escrita só do dono
-- (a foto vai em `avatars/<uid>/...`). Fotos impróprias entram na moderação
-- por denúncia (D-064).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users replace their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
