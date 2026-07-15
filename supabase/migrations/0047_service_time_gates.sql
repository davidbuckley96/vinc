-- Vinc — travas de tempo no ciclo do serviço (docs/14 · F-04/F-05, D-068).
--
-- Antes, nada olhava o relógio: dava pra pegar o código dias antes, iniciar um
-- serviço marcado pra amanhã e finalizar na hora. Agora:
--  * o código de check-in só aparece pro anunciante a partir de 30 min antes;
--  * (no gig-lifecycle) iniciar só é permitido a partir de 30 min antes;
--  * finalizar só é permitido 30 min após o INÍCIO REAL — por isso guardamos
--    quando o serviço entrou em `in_progress`.

-- Quando o serviço realmente começou (setado no gig-lifecycle no "start").
alter table public.gigs add column if not exists started_at timestamptz;

-- Código de check-in revelado ao anunciante só na janela de 30 min antes do
-- horário (F-04). A leitura do código passa por esta RLS, então isto é a trava
-- de verdade — o app só reflete.
drop policy if exists "posters read their gig's check-in code" on public.gig_checkin_codes;
create policy "posters read their gig's check-in code"
  on public.gig_checkin_codes for select to authenticated
  using (
    exists (
      select 1 from public.gigs g
      where g.id = gig_id
        and g.poster_id = (select auth.uid())
        and now() >= g.starts_at - interval '30 minutes'
    )
  );
