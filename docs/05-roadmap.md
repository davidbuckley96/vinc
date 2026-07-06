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
- [x] CRUD de vagas — criação com prévia (D-007); editar (vaga aberta, valor imutável) e excluir (reembolso do líquido, taxa fica) via Edge Functions (D-017, docs/02 §2.2), verificado e2e
- [~] Busca/listagem de vagas — categorias primeiro + vagas recentes (D-007); falta filtro por horário
- [x] Candidatura com aprovação do anunciante (modelo Uber, docs/02 §3, D-012) — trava atômica de 1 candidato; recusa sem multa reabre a vaga e bloqueia o candidato só para ela; escrow retido na aprovação; verificado e2e (14 checagens)
- [x] Bloqueio entre usuários (docs/02 §8) — botão no perfil público; vagas ocultas nas duas direções e candidatura impedida (verificado e2e); corte de mensagens entra junto com o chat
- [x] Ciclo de vida do serviço (aceita → em andamento → aguardando confirmação → concluída) — Edge Function `gig-lifecycle` + tela "uma ação por vez" (D-008), verificado e2e no backend real
- [x] Carteira simulada (ledger imutável + tela dois cartões, D-008) com multa do anunciante (cancel-gig, D-018: 25% piso R$ 10, 80% ao prestador lesado), verificado e2e — reformulação da tela vem com D-015
- [x] Reformulação da carteira (D-015/D-021, docs/02 §5.2, rodada 6 opção C): saldo único (recebido desde o último saque), abas Disponível/Em processamento (7 dias derivados do ledger, D-016), tela Histórico, saque simulado via função `withdraw` (verificado e2e), saldo aparece no pagamento do anúncio. (Pedido de reembolso dentro do prazo → disputas, Fase 2; Pix real → Fase 3)
- [x] Taxa de serviço na criação da vaga (D-013) — IMPLEMENTADO: pagamento antecipado via create-gig (taxa 10%-exemplo + escrow do líquido), taxa explícita na criação, prévia e busca com o líquido, reembolso do líquido na exclusão (delete-gig), tudo verificado e2e; e reembolso na expiração (job pg_cron a cada 5 min, D-022)
- [x] Avaliações mútuas (1–5) e reputação no perfil público — fluxo híbrido estrelas+marcadores (D-009), perfil com nota por papel; RLS só permite avaliar participante de serviço concluído, 1x por serviço
- [x] Localização por mapa (D-023, rodada 7 opção A): picker em tela cheia com pino fixo + busca (Nominatim), modal de mapa ao ver a vaga, lat/lng validados e persistidos (verificado e2e); MapLibre + OpenFreeMap (trocar tiles p/ MapTiler no pré-lançamento)
- [ ] Mensagens entre as partes dentro do app (chat simples; respeita bloqueios)
- [ ] Web e mobile funcionando com paridade

## Fase 2 — Confiança
- [ ] Denúncias, disputas e reembolsos (desenhar processo — parte mais complexa, ver dúvidas abertas)
- [ ] Notificações push (vaga aceita, lembretes de serviço, pagamento liberado)
- [ ] Mecanismos de prioridade para lesados por cancelamento (modelo Uber)
- [ ] Painel administrativo mínimo (análise de disputas)

## Fase 3 — Pagamentos reais
- [ ] Gateway brasileiro (Mercado Pago/Pagar.me — a decidir, dúvida #13) com split; meios de pagamento: Pix + cartões no lançamento, carteiras digitais conforme o gateway (D-016, dúvida #17)
- [ ] Saque via Pix para conta bancária do prestador (avaliar outras opções de pagamento digital — dúvida #17)
- [ ] KYC / verificação de identidade
- [ ] Cobrança real da multa e da taxa da plataforma

## Fase 4 — Crescimento
- [ ] Geolocalização e busca por proximidade/mapa
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
6. **Tiles do mapa**: o MVP usa OpenFreeMap (público, sem chave, sem SLA).
   Antes do lançamento, criar conta MapTiler (plano gratuito) e trocar
   `MAP_STYLE_URL` em `apps/mobile/src/components/location-map/config.ts`;
   revisar também o volume de geocodificação no Nominatim (política de uso
   justo — considerar um serviço pago se o volume crescer).

## Estado atual

**Última atualização:** 2026-07-03

- **Backend real (Supabase) operacional e verificado e2e**: projeto
  `gexzpkbqodoyoxudzklb`, migrations 0001–0010 aplicadas, Edge Functions
  ATIVAS: `create-gig`, `update-gig`, `delete-gig`, `apply-gig`,
  `respond-candidacy`, `cancel-gig`, `gig-lifecycle`, `withdraw`; job
  pg_cron `expire-due-gigs` (5 min). Google OAuth configurado. Credenciais
  públicas em `apps/mobile/.env.example`.
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
- **Fluxo de candidatura (D-012) no ar**: apply-gig + respond-candidacy
  deployadas (accept-gig legada removida); view visible_open_gigs filtra
  recusados e bloqueados; UI completa (candidatar-se, decisão do
  anunciante com aviso in-app, bloquear/desbloquear no perfil).
- **Editar/excluir vaga (D-017) no ar**: update-gig e delete-gig
  deployadas; exclusão reembolsa o líquido (taxa fica) com trava atômica
  contra reembolso duplo; edição só com vaga aberta e valor imutável;
  política de UPDATE do cliente removida (migrations 0007–0008 aplicadas);
  cartão "Vaga publicada" com botões Editar/Excluir e tela de edição com
  formulário compartilhado (GigForm).
- **Cancelamento com multa (D-018) no ar**: cancel-gig deployada — só o
  anunciante, só pós-aprovação (aceito/em andamento), atômica; devolve o
  valor do prestador, cobra 25% (piso R$ 10) e credita 80% ao prestador
  lesado; delete-gig recusa vagas pós-aprovação (sem fugir da multa);
  botão "Cancelar serviço" com aviso da multa e confirmação em dois toques.
- **Carteira nova (D-021) no ar**: derivação pura dos 7 dias no ledger
  (sem job), função `withdraw` deployada (saque simulado zera o
  disponível, respeitando o processamento — verificado e2e), tela com
  abas + histórico separado, saldo exibido no pagamento do anúncio.
- **Expiração de vagas (D-022) no ar**: função SQL `expire_due_gigs` +
  job pg_cron a cada 5 min (verificado e2e: expira aberta e pendente no
  início do horário, reembolsa o líquido uma única vez, poupa vagas
  futuras); busca e apply-gig recusam vagas já iniciadas.
- **Faltam na Fase 1**: punição de
  reputação do prestador que cancela (dúvida #5); localização por mapa
  (docs/02 §2.1, rodada de design + provedor, dúvida #15); mensagens no
  app (chat simples, respeitando bloqueios); filtro de busca por horário;
  revisão final de paridade web/mobile.
