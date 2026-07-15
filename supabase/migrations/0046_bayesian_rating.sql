-- Vinc — nota geral por média BAYESIANA (docs/14 · F-12, D-067).
--
-- Antes: `avg(rating)` puro. Uma conta nova (0 avaliações, mostrada como 5) que
-- levava um único 2 caía direto pra 2,00 — uma avaliação injusta destruía o
-- usuário. Agora a nota mistura um prior (m = 5, "começa em 5") com C = 5
-- avaliações-fantasma: nota = (C*m + Σnotas) / (C + n). Com poucas avaliações a
-- nota fica perto de 5 e vai convergindo pra real conforme n cresce (um 5→2 com
-- 1 avaliação vira 4,50; só depois de ~10-15 serviços reflete a média real).
-- Continua tudo DERIVADO na view (nada guardado) e com 2 casas decimais.
--
-- C e m como CTE pra ficar fácil de ajustar depois num único lugar.

drop view if exists public.profile_stats;
create view public.profile_stats
with (security_invoker = on) as
select
  p.id,
  p.name,
  p.avatar_url,
  p.city,
  -- Nota bayesiana geral (todas as avaliações recebidas).
  (select round(((5 * 5.0) + coalesce(sum(r.rating), 0)) / (5 + count(r.rating)), 2)
    from public.reviews r where r.reviewee_id = p.id) as avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id) as review_count,
  -- Nota bayesiana como TRABALHADOR (é a que aparece na lista de candidatos).
  (select round(((5 * 5.0) + coalesce(sum(r.rating), 0)) / (5 + count(r.rating)), 2)
    from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'worker') as worker_avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'worker') as worker_review_count,
  -- Nota bayesiana como ANUNCIANTE.
  (select round(((5 * 5.0) + coalesce(sum(r.rating), 0)) / (5 + count(r.rating)), 2)
    from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'poster') as poster_avg_rating,
  (select count(*) from public.reviews r
    where r.reviewee_id = p.id and r.reviewee_role = 'poster') as poster_review_count,
  (select count(*) from public.gigs g
    where g.worker_id = p.id and g.status = 'completed') as completed_as_worker,
  (select count(*) from public.gigs g
    where g.poster_id = p.id and g.status = 'completed') as completed_as_poster
from public.profiles p;
