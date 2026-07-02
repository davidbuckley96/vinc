# 05 — Roadmap

> A seção **Estado atual** (fim do arquivo) deve ser atualizada ao final de
> cada etapa concluída.

## Fase 0 — Fundação
- [x] Base documental (`docs/`, `CLAUDE.md`)
- [ ] Esqueleto do monorepo (pnpm + Expo + packages + supabase)
- [ ] CI básico (typecheck, lint, testes)
- [ ] Escolha da direção visual (rodada de opções de design) e tokens do design system

## Fase 1 — MVP (pagamentos simulados)
- [ ] Autenticação (e-mail/senha) e perfil
- [ ] Calendário home (visões dia/semana/mês; selecionar horário → buscar vaga ou anunciar)
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

- Fase 0 em andamento: base documental criada (visão, especificação,
  arquitetura, design, decisões D-001..D-004, dúvidas abertas).
- Próximos passos: esqueleto do monorepo; depois, primeira rodada de opções de
  design (direção visual + home/calendário) com o David.
- Nada de código de produto implementado ainda.
