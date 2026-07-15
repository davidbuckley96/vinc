# 13 — Revisão de código e roadmap de refatoração

> Revisão de arquitetura das mudanças feitas desde o 2º ciclo de testes do David
> (correções B-01…B-30 e V-01…V-09): mapa/geocoding, alertas/push, busca/vagas e
> perfil/agenda. Objetivo: achar código frágil, acoplado, duplicado ou não
> escalável e transformar em um plano de correção por partes.
>
> **Data da revisão:** 2026-07-15 · **Método:** 4 revisões paralelas, uma por
> subsistema, consolidadas aqui (sem duplicatas). Cada item cita `arquivo:linha`,
> impacto e esforço (S/M/L).

## Veredito geral

A arquitetura está **saudável na essência** e melhor do que a suspeita de
"código sloppy" sugeria: a UI passa por `packages/api` sem falar direto com o
Supabase (salvo 1 exceção), a validação da vaga é compartilhada entre app e Edge
Functions (o teto de R$ está corrigido na origem), a lógica de domínio em
`packages/core` continua pura, as migrações de RLS são cuidadosas e o algoritmo
de colunas da agenda é bem fatorado.

O débito real está concentrado em **dois lugares**:
1. **Banco / escala** — o match de alertas e a busca por distância rodam de
   formas que não aguentam volume (trigger inline na transação da vaga, índice
   removido sem querer, `limit(50)` com ordenação no cliente, N+1 em candidatos,
   e chamada síncrona ao Nominatim no caminho de publicar).
2. **Duplicação** — três calendários, faixas de horário definidas em três
   lugares, cabeçalho de perfil copiado, e a lógica do Nominatim repetida em duas
   Edge Functions.

E há **um punhado de bugs visíveis e baratos** (abaixo, Fase A) que vale corrigir
antes de tudo.

---

## Fase A — Bugs de correção (visíveis, baratos) · fazer primeiro

> **Status:** A1, A3, A4, A5 concluídos em 2026-07-15 (commit da Fase A parte 1).
> A2 é o único estrutural (passa `area` do geocoder até o create-gig) — feito à
> parte por tocar ~6 arquivos.

- [x] **A1 · Editar perfil/foto não atualiza a tela** — `profile/hooks.ts:61-62,84-85`
  invalidam `['profile-stats']`, mas a query de stats é `['profile','stats',userId]`
  (`reviews/hooks.ts:49`). Não casa (prefix-match) → nome/cidade/foto ficam velhos
  até reabrir o app. **Corrigido:** invalidação passa a usar `['profile','stats']`. — S
- [ ] **A2 · Centroide do bairro (D-066) não roda para endereços sem rua** —
  `shortLabel` (`lib/geocoding.ts:61-71`) só usa o separador `" — "` quando há
  rua; um clique em bairro/cidade devolve `"Boa Vista, Recife"` sem separador, e
  `deriveAreaLabel` (`core/location.ts:23-27`) cai no rótulo genérico → em
  `create-gig` o `area` vira "Região aproximada" e o `neighbourhoodCenter`
  retorna null (volta pro fuzz antigo). O recurso novo regride justamente no caso
  comum. **Passar `{area, city}` estruturado do geocoder até o create-gig** (ou
  um contrato de formato único entre `shortLabel` e `deriveAreaLabel`). — M
- [x] **A3 · Pino do local exato não fica ancorado** — `location-modal.tsx`.
  **Corrigido:** modo exato usa `marker` ancorado DENTRO do mapa (segue o lugar
  ao arrastar); overlay RQ removido; docstring corrigida. — S
- [x] **A4 · Calendário de faixa não re-sincroniza ao reabrir** —
  `date-range-calendar.tsx`. **Corrigido:** re-semeia o rascunho + mês na borda
  de abertura via ajuste de estado em render (sem effect, sem warning). — S
  *(Nota: `month-calendar.tsx:47` tem o mesmo padrão; se algum caller o mantiver
  montado, aplicar o mesmo ajuste — hoje ele é montado sob demanda.)*
- [x] **A5 · `Number()` sem validação no geocoding do cliente** — `lib/geocoding.ts`.
  **Corrigido:** `toGeoResults` descarta lat/lng não-finitos; `location-map.tsx` e
  `.web.tsx` sanitizam center/zoom/marker com fallback ao overview do Brasil. — S

## Fase B — Escala e banco (antes de ter carga) · alto valor

- [ ] **B1 · Match de alertas roda DENTRO da transação de criar vaga, sem guarda** —
  `notify_job_alerts` (`0043/0044`) é `after insert on gigs`; qualquer exceção
  (coluna errada, `time_band` inválido, `net.http_post` falho) faz rollback da
  vaga inteira — o mesmo modo de falha que já quebrou a criação. **Envolver o
  corpo em `begin…exception when others then…end` (rápido) e/ou desacoplar o
  fan-out para um worker assíncrono** (a inserção só enfileira 1 evento; um
  consumidor `pg_cron` faz o resto). — M (guarda) / L (fila)
- [ ] **B2 · Índice de match sumiu na 0044 → seq scan por vaga criada** — `0043:25`
  indexava `category_id`; `0044:9` derruba a coluna (e o índice) e cria
  `category_ids uuid[]` sem índice. **Criar índice GIN em `category_ids` (where
  active)** e ajustar o predicado para usá-lo. — S
- [ ] **B3 · Fan-out de push: 1 notificação = 1 pg_net = 1 invocação de send-push**,
  cada uma re-buscando o mesmo título da vaga (`0038`, `send-push/index.ts:52-72`).
  Uma vaga popular vira milhares de chamadas HTTP. **Despachar 1 vez por evento
  com a lista de destinatários; `send-push` busca o título uma vez e envia ao
  Expo em lotes de ≤100.** — M
- [ ] **B4 · Busca por região: `limit(50)` antes de ordenar por distância** —
  `packages/api/src/gigs.ts:112-153` busca as 50 vagas que começam mais cedo
  dentro de um quadrado e só então filtra o círculo e ordena por distância **no
  cliente**; uma vaga mais perto que comece depois fica invisível, e não há
  paginação. **Empurrar distância+raio para o SQL** (a função `distance_km` já
  existe em `0043:35`) via RPC/view ordenando por `distance_km`, com paginação
  keyset. Isso também **elimina a duplicação de haversine** (JS `distanceMeters`
  vs SQL `distance_km`) que hoje pode divergir entre busca e alerta. — M
- [ ] **B5 · `get-candidates` é N+1** — `get-candidates/index.ts:80-96` faz 3
  queries por candidato, em série; 20 candidatos ≈ 60 idas ao banco. **Buscar
  `profiles`/`profile_stats`/`reviews` de uma vez com `.in(ids)` e agrupar em
  memória** (o próprio arquivo já faz isso para `priority_windows`). — M
- [ ] **B6 · `create-gig` chama o Nominatim de forma síncrona ao publicar** —
  `create-gig/index.ts:170-173` faz um `fetch` (até 3 s) no caminho crítico da
  publicação. **Inserir a vaga com o fuzz na hora e resolver o centroide de forma
  assíncrona** (`EdgeRuntime.waitUntil` atualizando `approx_lat/lng`), ou cachear
  centroides por rótulo de bairro. — M
- [ ] **B7 · Nominatim direto, sem cache, provedor único** — `geocode/index.ts` e
  `create-gig` batem em `nominatim.openstreetmap.org` (política do OSM ≈ 1 req/s,
  proíbe uso em massa sem cache) a cada tecla e a cada publicação. **Adicionar
  cache (KV/Postgres por query normalizada) e tornar o provedor trocável por env**
  (LocationIQ/Mapbox), como os próprios comentários já prometem. — M

## Fase C — Desacoplamento e limpeza (manutenibilidade)

- [x] **C1 · Código morto: prop `circleMeters`** — `config.ts`, `location-map.tsx`,
  `location-map.web.tsx`. **Feito junto com A3/A5:** `circleMeters` e todo o
  desenho do círculo (nativo + web + trava de zoom) removidos; `marker` foi
  *religado* (usado pelo modo exato do `LocationModal`), então continua vivo. — S
- [ ] **C2 · Lógica do Nominatim duplicada em 2 Edge Functions** — URL, UA,
  headers, wrapper de fetch+timeout e o viewbox existem em `geocode/index.ts:13-41`
  e `create-gig/index.ts:46-91` (com `d` diferente). **Extrair
  `supabase/functions/_shared/nominatim.ts`** (não em `packages/core`, que deve
  ficar puro). — S
- [ ] **C3 · Faixas de horário definidas em 3 lugares** — SQL (`0043`+`0044`) e
  `alerts/labels.ts:7-11`; `time_bands` é `text[]` **sem CHECK** (banda inválida
  nunca casa, em silêncio). **Adicionar CHECK/enum e tratar os limites do SQL como
  fonte única.** — S
- [ ] **C4 · Três calendários** — `date-range-calendar.tsx`, `month-calendar.tsx`
  (Domingo primeiro) e `agenda/month-grid.tsx` (Segunda primeiro, inconsistente);
  ~150 linhas copiadas. **Extrair um `<MonthGrid>` primitivo** (células+nav+cabeçalho,
  uma convenção de início de semana). — M
- [ ] **C5 · Cabeçalho de perfil duplicado** — bloco avatar+nome+cidade e estilos
  copiados entre `profile-screen.tsx` e `public-profile-screen.tsx` (já divergem).
  **Extrair `<ProfileHeader>`.** — M
- [ ] **C6 · `profile-screen` e `search-screen` viram god-components** —
  `profile-screen` repete `status==='signedIn'` 6x e chama `@/lib/supabase`
  direto (única quebra da camada api); `search-screen` (~490 linhas) espalha o
  estado de filtro em 6 `useState`. **Extrair `<ProfileMenu>` data-driven** e
  **um `useGigFilters` (reducer) + `<DayHourChips>`**; rotear o push-self-test
  pela camada api/hooks. — M
- [ ] **C7 · Drift de deploy das Edge Functions** — funções empacotam uma *cópia*
  de `packages/core`; o runtime só atualiza no redeploy manual (foi assim que o
  create-gig subiu com draft velho). **Hook/CI que redeploya a função quando os
  imports de core mudam** (hash das entradas). — M
- [ ] **C8 · Falha de busca é indistinguível de "nada encontrado"** —
  `invokeGeocode` engole tudo para `null` e o proxy devolve `[]` em falha →
  mostra "Nenhum endereço encontrado" numa queda de rede (o `reverse` já faz
  certo com `ReverseOutcome`). **Propagar erro distinto de `[]` e mostrar "sem
  conexão".** — M
- [ ] **C9 · `lat/lng` como números posicionais soltos** — apesar do `LatLng` já
  existir em `core`. `onCenterChange:(lat,lng)`, `GeoResult`, `PickedLocation`,
  `Region` redeclaram campos crus (fácil trocar a ordem). **Padronizar `LatLng`.** — M

## Fase D — Endurecimento e nits (segurança/perf pontuais)

- [ ] **D1 · Ciclo de vida do avatar** — caminho com timestamp (`profile.ts:44-48`)
  faz `upsert` virar código morto e deixa fotos antigas órfãs e públicas para
  sempre; o bucket (`0042:40-42`) **não tem limite de tamanho nem MIME**; e
  `avatar_url` é gravável pelo cliente para qualquer URL (fura a moderação). **Path
  estável + cache-busting por query, `file_size_limit`+`allowed_mime_types` no
  bucket, e validar server-side que a URL aponta pro storage do projeto.** — S/M
- [ ] **D2 · Agenda quantizada por hora** — `day-timeline.tsx:60-64,143` posiciona
  por `getHours()`; 10:30 renderiza em 10:00, e uma vaga que vira a meia-noite vira
  bloco de 1h. Sem limite de colunas (`:136-138`) muitas candidaturas no mesmo
  horário ficam ilegíveis. **Posicionar por minutos e limitar colunas com "+N".** — M
- [ ] **D3 · Poda de token morto incompleta** — `send-push` só trata erro no
  *ticket* imediato, não nos *receipts* do Expo (onde vem a maioria dos
  `DeviceNotRegistered`). **Guardar ticket IDs e um `pg_cron` que consulta
  `getReceipts` e poda.** — M
- [ ] **D4 · Segredos e URLs fixos** — URL do projeto hard-coded no trigger
  (`0038:45`); `x-cron-secret` literal no corpo da função (legível via `pg_proc`)
  e compartilhado entre funções. **Mover para Vault / `current_setting`.** — S
- [ ] **D5 · Perf de render** — `buildDaySegments` e o lookup de pontos do
  `month-grid` recomputam a cada render; tab de perfil faz 2 fetches sobrepostos
  (`useProfileStats`+`useMyProfile`, só diferem por `bio`). **Memoizar; adicionar
  `bio` à view `profile_stats`.** — S
- [ ] **D6 · Nits** — `jumpTo` dispara `moveend` extra no mapa nativo (reverse
  redundante); `neighbourhoodCenter` não valida que o resultado é um bairro;
  filtro de vaga denunciada é client-side e come o teto de 50; predicado de
  sobreposição duplicado (server vs demo). — S cada

---

## Decisões que precisam do David (não inferíveis)

Alguns itens da Fase B mudam produto/arquitetura e devem virar decisão (docs/06)
antes de implementar:
- **B1/B3:** tornar as notificações **assíncronas** (fila) vs. só blindar o
  trigger. Fila é mais robusta e escalável, mas adiciona um `pg_cron`/worker.
- **B6/B7:** **cachear geocoding e/ou trocar de provedor** (LocationIQ/Mapbox têm
  planos gratuitos com política amigável a apps) — custo × robustez.

## Ordem sugerida

**Fase A** (bugs baratos, 1 lote) → **B2** (índice, trivial e crítico) → **B1**
(guarda no trigger) → **B5** (N+1) → **B4/B6/B7** (busca+geocoding, precisa de
decisão) → **Fase C** (limpeza) → **Fase D** (endurecimento).
