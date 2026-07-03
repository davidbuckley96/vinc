# 05 — Roadmap

> A seção **Estado atual** (fim do arquivo) deve ser atualizada ao final de
> cada etapa concluída.

## Fase 0 — Fundação
- [x] Base documental (`docs/`, `CLAUDE.md`)
- [x] Esqueleto do monorepo (pnpm + Expo + packages + supabase)
- [x] CI básico (typecheck, testes)
- [x] Escolha da direção visual (rodada 1: Opção C, roxo fintech — D-005) e tokens do design system

## Fase 1 — MVP (pagamentos simulados)
- [~] Autenticação (e-mail/senha + Google) e perfil — telas e fluxo prontos (D-006); falta criar o projeto Supabase e conectar
- [~] Calendário home (visões dia/semana/mês; selecionar horário → buscar vaga ou anunciar) — UI pronta com dados simulados; falta ligar ao backend
- [~] CRUD de vagas — criação pronta (Anunciar com prévia, D-007); faltam editar/excluir
- [~] Busca/listagem de vagas — categorias primeiro + vagas recentes (D-007); falta filtro por horário
- [~] Aceite atômico com checagem de conflito de agenda — Edge Function
  `accept-gig` pronta + tela de detalhe com aceite; falta o David rodar
  `supabase functions deploy accept-gig` (requer Supabase CLI logada)
- [ ] Ciclo de vida do serviço (aceita → em andamento → concluída + confirmação do anunciante)
- [ ] Carteira simulada: escrow no aceite, liberação na confirmação, multa do anunciante
- [ ] Avaliações mútuas (1–5) e reputação no perfil público
- [ ] Web e mobile funcionando com paridade

## Fase 2 — Confiança
- [ ] Denúncias, disputas e reembolsos (desenhar processo — parte mais complexa, ver dúvidas abertas)
- [ ] Notificações push (vaga aceita, lembretes de serviço, pagamento liberado)
- [ ] Mecanismos de prioridade para lesados por cancelamento (modelo Uber)
- [ ] Painel administrativo mínimo (análise de disputas)

## Fase 3 — Pagamentos reais
- [ ] Gateway brasileiro (Mercado Pago/Pagar.me — a decidir) com split
- [ ] Saque via Pix para conta bancária do prestador
- [ ] KYC / verificação de identidade
- [ ] Cobrança real da multa e da taxa da plataforma

## Fase 4 — Crescimento
- [ ] Geolocalização e busca por proximidade/mapa
- [ ] Chat entre as partes
- [ ] Filtros avançados, recomendações, favoritos
- [ ] Publicação nas lojas (App Store / Play Store)

---

## ⚠️ Checklist de pré-lançamento (obrigatório antes do deployment real)

Itens desligados/simplificados durante o desenvolvimento que DEVEM ser
revisados antes de abrir o app ao público:

1. **Reativar "Confirm email"** (painel Supabase → Authentication → Sign In /
   Providers → Email). Desativado em 2026-07-03 para permitir testes
   end-to-end automatizados. **Recomendação: reativar sim** — sem confirmação
   de e-mail, contas falsas em massa ficam triviais e minam o sistema de
   reputação, que é o núcleo do produto (docs/01). Avaliar no mesmo momento a
   verificação por SMS/telefone como alternativa mais forte (padrão em apps
   de serviço no Brasil).
2. Reativar/verificar limites de rate-limit de auth no painel.
3. Revogar tokens de acesso pessoais criados durante o desenvolvimento
   (`SUPABASE_ACCESS_TOKEN` expira ~2026-08-01; verificar lista em
   supabase.com/dashboard/account/tokens).
4. Trocar as credenciais OAuth do Google se o client secret tiver circulado
   fora do painel; tirar o app do modo de teste (OAuth consent screen →
   publicar) para permitir logins de qualquer conta Google.
5. Migrar e-mails transacionais para um provedor SMTP próprio (o SMTP
   embutido do Supabase é só para desenvolvimento e tem limites baixos).

## Estado atual

**Última atualização:** 2026-07-02

- **Fase 0 concluída**: base documental; monorepo (Expo SDK 57 + expo-router,
  `packages/core` testado, `packages/api`, `supabase/`); CI; direção visual C
  (roxo fintech) escolhida pelo David e tokens implementados (claro/escuro).
- **Fase 1 em andamento**:
  - Home/calendário com dados simulados — visões dia (timeline por hora com
    compromissos, horários livres e ações "Buscar serviços"/"Anunciar vaga"),
    semana e mês; navegação por 5 abas (Buscar/Anunciar/Carteira ainda são
    placeholders).
  - Autenticação implementada (D-006): tela única entrar/criar conta com
    e-mail/senha + Google (OAuth PKCE no nativo, redirect na web), sessão
    persistida, gate de rotas (com backend configurado o app exige login;
    sem backend roda em modo demonstração), aba Perfil com sair/entrar.
  - Schema inicial do banco versionado (`supabase/migrations/0001`):
    profiles (com trigger de criação no signup), categories (com seed) e
    gigs com RLS e regras de coerência de status.
  - Verificado no navegador com screenshots (build web + Playwright).
- **Projeto Supabase criado pelo David** (2026-07-02):
  `https://gexzpkbqodoyoxudzklb.supabase.co` — URL e chave publicável estão em
  `apps/mobile/.env.example` (copiar para `.env`). Pendências do David no
  painel: aplicar `supabase/migrations/0001` via SQL Editor, ativar o provedor
  Google (credenciais OAuth do Google Cloud) e trocar/invalidar a service key
  legada que foi exposta em chat. Obs.: o ambiente remoto de desenvolvimento
  bloqueia `supabase.co`, então testes end-to-end de auth/dados são feitos na
  máquina do David até a liberação da rede.
- Telas Buscar (categorias primeiro) e Anunciar (formulário com prévia)
  implementadas e conectadas ao Supabase via React Query, com fallback de
  demonstração sem backend; validação de vaga no `core` (14 testes).
- Detalhe da vaga (`/gig/[id]`) com aceite em um toque; Edge Function
  `accept-gig` (atômica, com checagem de conflito reusando o `core`);
  agenda da home agora usa dados reais do usuário logado (mock apenas em
  modo demonstração).
- **Verificação de backend (2026-07-02, rede do ambiente liberada):**
  ✅ API do Supabase alcançável; ✅ migration 0001 aplicada (tabelas
  profiles/categories/gigs existem, RLS bloqueando leitura anônima como
  projetado); ✅ provedor Google ATIVO e e-mail/senha ativo (confirmação de
  e-mail exigida); ✅ app real no navegador conversando com a API real
  (erro de credenciais traduzido renderizado). Obs. técnica: o Chromium de
  teste não fala com o proxy de rede do ambiente diretamente — as chamadas
  ao Supabase são roteadas pela camada Node do Playwright (`page.route` →
  `context.request`), padrão já usado nos scripts de verificação.
- ✅ Edge Function `accept-gig` deployada pelo David (v1 ATIVA) e verificada:
  responde com os códigos de resultado do nosso contrato (`unauthorized`
  para chamador sem login).
- **Deploys pelo Claude:** o David gerou um `SUPABASE_ACCESS_TOKEN` (expira
  ~2026-08-01). A CLI do Supabase tem problema de transporte com o proxy do
  ambiente; usar a **Management API direto com curl**
  (`https://api.supabase.com/v1/projects/gexzpkbqodoyoxudzklb/...` com
  `Authorization: Bearer $SUPABASE_ACCESS_TOKEN` e
  `--cacert /root/.ccr/ca-bundle.crt`), que funciona. O token deve estar nas
  variáveis do ambiente do Claude Code (não no repositório).
- **Pendência para e2e autenticado do Claude:** desativar "Confirm email"
  (Authentication → Sign In / Providers → Email) durante o desenvolvimento
  ou criar 2 usuários de teste confirmados no painel.
- Próximos passos da Fase 1: editar/excluir vaga própria; ciclo de vida do
  serviço (iniciar/concluir/confirmar); carteira simulada.
