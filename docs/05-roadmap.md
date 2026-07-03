# 05 — Roadmap

> A seção **Estado atual** (fim do arquivo) deve ser atualizada ao final de
> cada etapa concluída.

## Fase 0 — Fundação
- [x] Base documental (`docs/`, `CLAUDE.md`)
- [x] Esqueleto do monorepo (pnpm + Expo + packages + supabase)
- [x] CI básico (typecheck, testes)
- [x] Escolha da direção visual (rodada 1: Opção C, roxo fintech — D-005) e tokens do design system

## Fase 1 — MVP (pagamentos simulados)
- [x] Autenticação (e-mail/senha + Google, D-006) — conectada ao Supabase real e verificada (cadastro, login, OAuth Google ativo)
- [x] Calendário home (visões dia/semana/mês; horário livre → buscar/anunciar) — ligado à agenda real do usuário
- [~] CRUD de vagas — criação pronta (Anunciar com prévia, D-007); faltam editar/excluir
- [~] Busca/listagem de vagas — categorias primeiro + vagas recentes (D-007); falta filtro por horário
- [x] Aceite atômico com checagem de conflito de agenda — `accept-gig` v2 deployada e verificada e2e (atomicidade, conflito, own_gig)
- [x] Ciclo de vida do serviço (aceita → em andamento → aguardando confirmação → concluída) — Edge Function `gig-lifecycle` + tela "uma ação por vez" (D-008), verificado e2e no backend real
- [~] Carteira simulada: escrow no aceite e liberação na confirmação prontos (ledger imutável + tela dois cartões, D-008); falta a multa do anunciante (cancelamento pós-aceite)
- [x] Avaliações mútuas (1–5) e reputação no perfil público — fluxo híbrido estrelas+marcadores (D-009), perfil com nota por papel; RLS só permite avaliar participante de serviço concluído, 1x por serviço
- [ ] Localização por mapa (pino arrastável + busca no mapa ao anunciar; modal de mapa ao ver a vaga — docs/02 §2.1; requer provedor de mapas, ver dúvidas #15)
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

**Última atualização:** 2026-07-03

- **Backend real (Supabase) operacional e verificado e2e**: projeto
  `gexzpkbqodoyoxudzklb`, migrations 0001–0004 aplicadas, Edge Functions
  `accept-gig` (v2, com escrow) e `gig-lifecycle` ATIVAS, Google OAuth
  configurado. Credenciais públicas em `apps/mobile/.env.example`.
- **Fluxos completos funcionando com dados reais**: cadastro/login (e-mail e
  Google) → publicar vaga → buscar por categoria → detalhe → aceite atômico
  (escrow retido) → iniciar → concluir → confirmação do anunciante (escrow
  liberado) → carteira → avaliação híbrida → reputação por papel no perfil.
- **Operação do Supabase pelo Claude**: usar a Management API via curl
  (`https://api.supabase.com/v1/projects/<ref>/database/query` para SQL e
  `/functions/deploy?slug=<slug>` multipart para functions) com
  `Authorization: Bearer $SUPABASE_ACCESS_TOKEN` e
  `--cacert /root/.ccr/ca-bundle.crt`. A CLI oficial não funciona com o
  proxy deste ambiente. Token expira ~2026-08-01.
- **Verificação visual**: builds web em modo demonstração (sem `.env`) +
  Playwright; para testar contra o backend real no navegador daqui, rotear
  as chamadas do Supabase via `page.route` → `context.request` (o Chromium
  não fala com o proxy do ambiente diretamente).
- **Faltam na Fase 1**: cancelamento com multa do anunciante;
  editar/excluir vaga própria; localização por mapa (docs/02 §2.1, rodada
  de design + provedor, dúvida #15); revisão final de paridade web/mobile.
