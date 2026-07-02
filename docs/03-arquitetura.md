# 03 — Arquitetura

## Stack (decisões D-001 e D-002)

| Camada | Tecnologia | Papel |
|---|---|---|
| App (iOS/Android/Web) | **React Native + Expo** (TypeScript, Expo Router) | Um único código para as três plataformas; web via `react-native-web` |
| Backend | **Supabase** | Postgres, Auth, Realtime, Storage |
| Regras críticas | **Supabase Edge Functions** (Deno/TS) | Aceite atômico, escrow, multas, liberação de pagamento — nunca no cliente |
| Monorepo | **pnpm workspaces** | Reuso de código entre app e funções |

## Estrutura do monorepo

```
vinc/
├── CLAUDE.md               # instruções de sessão (fonte de verdade)
├── docs/                   # documentação do produto e arquitetura
├── apps/
│   └── mobile/             # app Expo (iOS + Android + web)
│       └── src/
│           ├── app/        # rotas (Expo Router) — só composição de telas
│           ├── features/   # 1 pasta por feature (ver abaixo)
│           ├── components/ # componentes de UI genéricos (design system)
│           └── lib/        # infra do app (cliente supabase, config, i18n)
├── packages/
│   ├── core/               # domínio puro em TS: tipos, regras, validações.
│   │                       #   SEM dependência de React/Supabase/plataforma.
│   └── api/                # acesso a dados: queries/mutations Supabase
│                           #   tipadas, usadas pelo app e por testes
└── supabase/
    ├── migrations/         # schema SQL versionado
    └── functions/          # Edge Functions (regras críticas)
```

### Anatomia de uma feature (`apps/mobile/src/features/<nome>/`)

```
features/gigs/
├── components/   # UI específica da feature
├── hooks/        # estado e orquestração (React Query + packages/api)
└── screens/      # telas montadas, plugadas nas rotas de src/app/
```

## Princípios técnicos (obrigatórios)

1. **Domínio puro no `packages/core`.** Regras como "há conflito de agenda?",
   "qual o valor da multa?", cálculo de médias de avaliação — funções puras,
   testáveis, sem I/O. UI e Edge Functions consomem o mesmo código.
2. **Dependências apontam para dentro:** `app → features → packages/api →
   packages/core`. `core` não importa de ninguém; features não importam umas
   das outras (compõem-se nas rotas).
3. **Dinheiro e aceite só no backend.** O cliente nunca decide resultado
   financeiro nem vence corrida de aceite; Edge Functions + transações SQL +
   RLS garantem isso.
4. **Ledger imutável:** movimentos financeiros são apenas inseridos, nunca
   editados; saldos são derivados.
5. **Estados como máquina de estados** (vaga/serviço): transições validadas em
   `core` e aplicadas no banco com checagem do estado anterior.
6. **UI a partir do design system** (`components/` + tokens de `04-design.md`);
   nada de estilos ad-hoc espalhados.

## Modelo de dados (rascunho — refinar na implementação)

```
profiles        id, name, avatar_url, bio, created_at
categories      id, name, icon, parent_id?
gigs            id, poster_id, category_id, title, description,
                starts_at, ends_at, price_cents, address, status
                status: open | accepted | in_progress | completed |
                        cancelled_by_poster | cancelled_by_worker | expired
gig_assignments gig_id, worker_id, accepted_at, state
availability    user_id, weekday/slots ou blocos de bloqueio de agenda
reviews         id, gig_id, reviewer_id, reviewee_id, role, rating(1-5), comment?
wallets         user_id, (saldo derivado do ledger)
ledger_entries  id, wallet_id, gig_id?, type, amount_cents, created_at
                type: deposit | escrow_hold | escrow_release | fee |
                      fine | refund | withdrawal
disputes        (fase 2 — a desenhar)
```

Reputação (média, contagem, serviços concluídos) é **derivada** (view ou
colunas materializadas atualizadas por trigger), nunca editável diretamente.

## Convenções

- TypeScript estrito em tudo; código e commits em inglês.
- Testes: unitários para `packages/core` (obrigatório para regras de negócio);
  integração para Edge Functions.
- Estado de servidor no app: React Query. Estado local: hooks/Zustand se preciso.
- Migrations SQL sempre versionadas em `supabase/migrations` — nunca alterar
  schema pelo dashboard sem gerar migration.
