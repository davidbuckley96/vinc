-- B-23 (D-060): o app precisa saber se o usuário já denunciou uma vaga
-- (para escondê-la da lista, bloquear a candidatura e evitar denúncia
-- repetida). A RLS só permitia admin ler `reports`; adiciona leitura das
-- PRÓPRIAS denúncias.
create policy "users read their own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
