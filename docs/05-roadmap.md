# 05 — Roadmap

> A seção **Estado atual** (fim do arquivo) deve ser atualizada ao final de
> cada etapa concluída.

## Fase 0 — Fundação
- [x] Base documental (`docs/`, `CLAUDE.md`)
- [x] Esqueleto do monorepo (pnpm + Expo + packages + supabase)
- [x] CI básico (typecheck, testes)
- [x] Escolha da direção visual (rodada 1: Opção C, roxo fintech — D-005) e tokens do design system

## Fase 1 — MVP (pagamentos simulados)
- [ ] Autenticação (e-mail/senha) e perfil
- [~] Calendário home (visões dia/semana/mês; selecionar horário → buscar vaga ou anunciar) — UI pronta com dados simulados; falta ligar ao backend
- [ ] CRUD de vagas (categoria, descrição, data/horário, valor, local)
- [ ] Busca/listagem de vagas por horário e categoria
- [ ] Aceite atômico com checagem de conflito de agenda
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

## Estado atual

**Última atualização:** 2026-07-02

- **Fase 0 concluída**: base documental; monorepo (Expo SDK 57 + expo-router,
  `packages/core` testado, `packages/api`, `supabase/`); CI; direção visual C
  (roxo fintech) escolhida pelo David e tokens implementados (claro/escuro).
- **Fase 1 iniciada**: home/calendário implementada com dados simulados —
  visões dia (timeline por hora com compromissos, horários livres e ações
  "Buscar serviços"/"Anunciar vaga"), semana e mês; navegação por 5 abas
  (Agenda, Buscar, Anunciar, Carteira, Perfil — as 4 últimas são placeholders).
  Verificado no navegador com screenshots (build web estática + Playwright).
- Próximos passos da Fase 1: autenticação (Supabase) e telas de vaga
  (busca e criação) — cada tela nova passa antes por rodada de opções de
  design com o David.
