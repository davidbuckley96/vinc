# 10 — Infra, CI/CD e observabilidade (plano)

> Pedido do David (2026-07-13): pensar o backend também — registro de logs,
> observabilidade, dashboards, CI/CD e um pipeline de deploy de versões com
> testes automáticos no build; e que **fazer uma nova versão seja fácil**.
> Este documento é a **reflexão + o plano** (ainda não implementado); as
> tarefas entram no roadmap (Fase 4 / Infra).

## 1. "Precisa de build novo?" — o modelo do Expo/React Native

Depende do tipo de mudança. É a maior alavanca de agilidade:

| Tipo de mudança | Precisa de build novo na loja? | Como entrega |
|---|---|---|
| **JS/TS** (telas, lógica, textos, a maior parte do nosso trabalho) | **Não** | **OTA** (EAS Update / `expo-updates`): o app baixa o novo bundle no próximo abrir, sem revisão da loja |
| **Nativo** (novo módulo nativo, permissão, ícone, splash, upgrade de SDK, config plugin como o `expo-notifications`) | **Sim** | **EAS Build** → novo AAB → enviar à Play Store |
| **Backend** (Edge Functions, migrations SQL, cron) | Independe do app | Deploy próprio (hoje via Management API; CI automatiza) |

Ou seja: o dia a dia (JS) sai por **OTA em minutos**; builds nativos são
raros. O pipeline deve tornar os dois **um clique**.

## 2. CI/CD — pipeline proposto (GitHub Actions)

Monorepo pnpm (`apps/mobile`, `packages/*`, `supabase/`). Um workflow por gatilho:

- **Em Pull Request** (barra o merge se algo falha):
  - `pnpm install` (cache), **typecheck** (`tsc` em core/api/mobile),
    **testes** (`vitest`), **lint**. Já temos "CI básico" na Fase 0 —
    formalizar e expandir.
- **No merge para `main` (staging):**
  - Aplicar **migrations** e **deploy das Edge Functions** no projeto de
    **staging** (Supabase CLI, ver §5).
  - **EAS Update** (OTA) do canal `staging`.
- **Em tag de release `vX.Y.Z` (produção):**
  - Migrations + functions no projeto de **produção**.
  - **EAS Update** do canal `production` (JS) **e/ou** **EAS Build** + submit
    à Play Store quando houve mudança nativa (detectar por labels/paths).
- **Agendado (diário):** rodar a suíte e um smoke e2e contra staging.

Regras: testes verdes obrigatórios antes de qualquer deploy; deploy de
produção só por tag (rastreável); rollback de OTA = republicar o bundle
anterior (EAS mantém histórico).

## 3. Migrations e deploy do backend (formalizar)

Hoje aplicamos SQL e functions pela **Management API via curl** (o ambiente
de dev não fala com a CLI). Para o pipeline:

- Manter `supabase/migrations/*.sql` como **fonte única** (já é o caso).
- Adotar o **Supabase CLI** no CI (`supabase db push`, `supabase functions
  deploy`) — no CI a CLI funciona (o obstáculo do proxy é só deste ambiente).
- **Nunca** editar o banco à mão em produção; tudo por migration versionada.
- Segredos de função (`CRON_SECRET`, `MP_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`,
  …) no cofre do Supabase + GitHub Actions Secrets; rotação documentada.

## 4. Observabilidade

### 4.1 App (cliente)
- **Sentry** (`@sentry/react-native` / sentry-expo): crashes + performance +
  breadcrumbs, com release/version amarrados ao EAS. Alerta de pico de erro.

### 4.2 Backend (Edge Functions + Postgres)
- **Logs estruturados** nas functions: nível (info/warn/error), `request_id`,
  usuário/rota — em vez de `console.log` solto. Padronizar um helper.
- **Log drain**: os logs das Edge Functions e do Postgres vão para o
  explorador do Supabase (Logflare); para retenção/busca melhores, drenar
  para **Better Stack / Axiom / Grafana Loki**.
- **Métricas de banco**: painel do Supabase + `pg_stat_statements` (queries
  lentas), alertas de erro/conexões.
- **Saúde dos jobs**: os cron (`run-money-jobs`, expirações, `dispatch_push`)
  precisam de **heartbeat/alerta** se falharem (hoje falham em silêncio) —
  registrar última execução e alertar se atrasar.

### 4.3 Dashboards de produto/negócio
- Métricas que importam: funil (cadastro → 1ª vaga → 1º match → serviço
  concluído), **deflexão do suporte** (Vi resolve vs. escala), cancelamentos/
  suspensões, GMV/taxa quando o Pix real entrar.
- Implementação leve: **views SQL** + um dashboard (**Metabase** ou
  **Grafana**) lendo uma réplica; ou uma tabela de `events` se precisarmos de
  eventos de produto além do que o schema já conta.

### 4.4 Uptime & alertas
- Health-check das Edge Functions e do site; alerta para e-mail/Slack.

## 5. Ambientes (dev / staging / produção)

Hoje há **um** projeto Supabase (que serve de dev). Antes de abrir ao
público:
- Criar um projeto **staging** (mesmas migrations/functions) para o CI testar
  contra um banco não-produtivo.
- **Produção** separada, com dados reais, só recebendo deploy por tag.
- `.env` por ambiente; nunca misturar credenciais.

## 6. Extensibilidade & Kubernetes — reflexão

- **Hoje somos serverless**: Postgres gerenciado + **Edge Functions (Deno)**
  + `pg_cron`/`pg_net`. Escala sem gerenciarmos servidores. **Recomendação:
  seguir serverless** — **Kubernetes agora é prematuro** (custo operacional
  alto sem ganho; nada no produto exige).
- **O que já nos protege:** a **lógica de domínio é pura e desacoplada**
  (`packages/core`), e usamos o padrão de **portas trocáveis**
  (`PaymentProvider`, `assistant`). Se um dia precisarmos mover a computação
  (para contêineres próprios, Cloud Run/Fly, ou K8s), a lógica **porta junto**
  sem reescrita.
- **Gatilhos para reavaliar** (sair do gerenciado): limites de escala/custo do
  Supabase, exigência de compliance/isolamento, ou necessidade de workloads
  que Edge Functions não cobrem (processamento pesado/filas). Caminhos então:
  Supabase self-hosted, ou extrair serviços para contêineres (Cloud Run →
  K8s se a orquestração justificar). **Decidir por dados, não por hype.**

## 7. Stack ideal recomendada (resumo)

| Camada | Escolha | Porquê |
|---|---|---|
| CI/CD | **GitHub Actions** | já no GitHub; grátis p/ o nosso volume |
| Build/entrega do app | **EAS Build + EAS Update (OTA)** | JS por OTA (rápido), nativo por build; canais staging/prod |
| Deploy backend | **Supabase CLI** no CI (migrations + functions) | fonte única versionada |
| Erros do app | **Sentry** | padrão de mercado, integra com EAS |
| Logs backend | **Logflare (Supabase)** → drain p/ **Better Stack/Axiom** | retenção e busca |
| Dashboards | **Grafana/Metabase** sobre views SQL | métricas de produto e infra |
| Alertas | health-checks + heartbeat dos cron → e-mail/Slack | jobs não falharem calados |
| Compute | **serverless (Supabase)**; K8s só se os gatilhos §6 aparecerem | menor custo operacional |

## 8. Próximas tarefas (entram no roadmap)

1. **CI de PR** completo (typecheck + vitest + lint, barra merge).
2. **Pipeline de deploy** (staging no merge; produção por tag) com Supabase
   CLI + **EAS Update/Build** e canais.
3. **Projeto de staging** separado do de produção.
4. **Sentry** no app + **logs estruturados** nas Edge Functions.
5. **Heartbeat/alerta** dos cron jobs.
6. **Dashboards** de produto/infra (funil, deflexão do suporte, saúde).

Prioridade sugerida: 1 e 2 primeiro (facilitam todo o resto e já dão o
"nova versão fácil"), depois 4/5 (observabilidade), 3 e 6 perto do
lançamento. Nada disso bloqueia o desenvolvimento de features atual.

## 9. Escalabilidade (dúvida do David, 2026-07-13)

**Pergunta:** de 10 → 10.000 → 100.000+ usuários, o backend é elástico?
Mudanças estruturais ficam difíceis com usuários reais.

**Resposta curta:** a maior parte da stack é **elástica/gerenciada** e escala
sozinha; o único ponto de atenção é o **Postgres primário**, que tem uma
sequência conhecida de alavancas **operacionais (não reescrita)** que aguenta
**100k+ usuários** confortavelmente.

### Por componente
- **Edge Functions (Deno serverless):** auto-escalam, sem estado. ✅
- **PostgREST / Auth / Realtime / Storage:** gerenciados, escalam com o plano. ✅
- **Postgres (primário único):** o coração — onde mora a atenção.

### Pista do Postgres (na ordem)
1. **Resize vertical** (mais CPU/RAM — um clique). Postgres indexado faz
   milhares de req/s e milhões de linhas. 100k users não é "grande".
2. **Connection pooling** (Supavisor/PgBouncer — já incluso).
3. **Réplicas de leitura** (Supabase oferece): busca/feed/perfil nas réplicas,
   primário só p/ escrita.
4. **Partição/arquivamento** das tabelas grandes (ledger, notifications,
   messages) — só na casa dos milhões de linhas; otimização tardia.

### Por faixa
| Usuários | Ação | Muda estrutura? |
|---|---|---|
| ≤ 1k | nada | não |
| 1k–10k | compute pequeno + índices + pooling | não |
| 10k–100k | compute médio + talvez 1 réplica; olhar queries lentas/Realtime | não |
| 100k–1M+ | réplicas + partição + cache de leituras quentes | só otimização |
| além | sharding/serviços dedicados nos caminhos quentes | pontual, por métrica |

### Mitigando o risco de "mudar com users reais"
- Alavancas de escala são **botões**, não reescrita (resize/réplica/índice/partição não tocam a lógica).
- **Lógica de domínio desacoplada** (`packages/core` + portas) → mudança estrutural fica contida.
- **Risco real = migração de schema em tabela grande.** Mitigação: migrations
  versionadas + **staging + CI** (testar antes) + mudança **aditiva** (coluna
  nullable → backfill → restringe), sem operação destrutiva.

### Proativo agora (barato, evita dor)
1. Índice em **toda FK** e em **todo predicado de RLS** (auditar).
2. `pg_stat_statements` + alerta de query lenta (§4.2).
3. Trabalho pesado fora do request (jobs — já fazemos).
4. Realtime só onde a tela precisa (canal por vaga/ticket — já fazemos).

### Opinião
Forma **padrão, comprovada e elástica**; escala a 100k+ com botões, não
reescrita. **Não** over-engenharia agora (sem K8s/microserviços/sharding —
prematuro). Prevenção barata + plataforma gerenciada escalando; reavaliar
por **métricas reais**. Ressalvas honestas: em escala grande **paga-se mais**
(compute + réplicas) e há **acoplamento ao Supabase** (Postgres é portável;
Auth/Realtime/Functions são "sabor Supabase" — o core desacoplado reduz a dor
de uma eventual saída).

## 10. Login com Google (OAuth) — config no painel (B-01)

O **código do app já está pronto** (PKCE nativo com deep link + troca de code;
ver `auth-actions.ts` e `supabase.ts`). O erro "localhost recusado" é sempre
**allowlist de redirect faltando** nos painéis. Passos (David):

1. **Supabase → Authentication → URL Configuration → Redirect URLs:** adicionar
   - `vinc://auth` (app instalado — o scheme é `vinc`, ver `app.json`);
   - a URL do site web publicado (produção) e, se for testar no Expo Go, a URL
     `exp://…` que o Expo mostra ao rodar.
2. **Supabase → Authentication → Providers → Google:** habilitar e colar o
   **Client ID** e **Client Secret** gerados no Google.
3. **Google Cloud Console → APIs e Serviços → Credenciais → OAuth 2.0 →
   Authorized redirect URIs:** adicionar o callback do Supabase
   `https://gexzpkbqodoyoxudzklb.supabase.co/auth/v1/callback`.

Feito isso, o botão "Entrar com Google" volta ao app pelo `vinc://auth` (nativo)
ou pela origem do site (web), sem cair no `localhost`. Nada disso é código — é
configuração de projeto, por isso não entra em commit.
