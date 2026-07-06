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
- [x] Busca/listagem de vagas — categorias primeiro + vagas recentes (D-007) + filtro por dia/hora (chips; vaga aparece se SOBREPÕE o horário filtrado; o 'Buscar serviços' do horário livre da agenda chega com dia+hora pré-selecionados)
- [x] Candidatura com ESCOLHA entre múltiplos candidatos anonimizados (D-024, docs/02 §3, rodada 8 opção A; substituiu o modelo Uber de D-012) — backend verificado e2e (11 checagens) e UI completa: cartões comparáveis (primeiro nome, nota, serviços, elogios frequentes) com Escolher/Recusar na vaga do anunciante; estados do candidato no detalhe da vaga; candidatura tracejada na agenda (não trava horário)
- [x] Bloqueio entre usuários (docs/02 §8) — botão no perfil público; vagas ocultas nas duas direções e candidatura impedida (verificado e2e); corte de mensagens entra junto com o chat
- [x] Ciclo de vida do serviço (aceita → em andamento → aguardando confirmação → concluída) — Edge Function `gig-lifecycle` + tela "uma ação por vez" (D-008), verificado e2e no backend real
- [x] Carteira simulada (ledger imutável + tela dois cartões, D-008) com multa do anunciante (cancel-gig, D-018: 25% piso R$ 10, 80% ao prestador lesado), verificado e2e — reformulação da tela vem com D-015
- [x] Reformulação da carteira (D-015/D-021, docs/02 §5.2, rodada 6 opção C): saldo único (recebido desde o último saque), abas Disponível/Em processamento (7 dias derivados do ledger, D-016), tela Histórico, saque simulado via função `withdraw` (verificado e2e), saldo aparece no pagamento do anúncio. (Pedido de reembolso dentro do prazo → disputas, Fase 2; Pix real → Fase 3)
- [x] Taxa de serviço na criação da vaga (D-013) — IMPLEMENTADO: pagamento antecipado via create-gig (taxa 10%-exemplo + escrow do líquido), taxa explícita na criação, prévia e busca com o líquido, reembolso do líquido na exclusão (delete-gig), tudo verificado e2e; e reembolso na expiração (job pg_cron a cada 5 min, D-022)
- [x] Avaliações mútuas (1–5) e reputação no perfil público — fluxo híbrido estrelas+marcadores (D-009), perfil com nota por papel; RLS só permite avaliar participante de serviço concluído, 1x por serviço
- [x] Localização por mapa (D-023, rodada 7 opção A): picker em tela cheia com pino fixo + busca (Nominatim), modal de mapa ao ver a vaga, lat/lng validados e persistidos (verificado e2e); MapLibre + OpenFreeMap (trocar tiles p/ MapTiler no pré-lançamento)
- [x] Mensagens entre as partes dentro do app (D-025, docs/02 §9, rodada 9 opção B) — backend verificado e2e (participantes do serviço vinculado, sem falsificar remetente, bloqueio corta nos dois sentidos, imutáveis, realtime) + UI: bolhas com respostas prontas de um toque, botão Conversar com contador de novas (marcas de leitura verificadas e2e)
- [x] Web e mobile funcionando com paridade — varredura das 12 telas em viewport desktop (1280px): layout centralizado via MaxContentWidth, sem quebras; mapa web nativo (MapLibre) e app via WebView; teclado tratado no chat (KeyboardAvoidingView)

## Fase 2 — Confiança (desenho fechado em D-028; ordem de execução abaixo)
- [x] 2.1 Auto-liberação em 48h — `awaiting_since` + job pg_cron a cada 15 min (verificado e2e: não libera antes das 48h, libera com escrow_release depois)
- [x] 2.2 Check-in por código — gerado na escolha, legível só pelo anunciante (tabela própria + RLS, verificado e2e), prestador digita para iniciar (código errado recusado); vagas antigas sem código iniciam livre
- [x] 2.3 Endereço/pino aproximados antes da escolha; completos para o escolhido (D-028/D-030) — exato em `gig_addresses` (RLS: anunciante + designado), `gigs` só com região + pino deslocado 250–600 m fixado na criação, círculo no mapa; verificado e2e (8 checks)
- [x] 2.4 Disputas e reembolsos (D-028/D-031) — backend no ar e verificado e2e (15 checks): status `disputed`, tabelas disputes/dispute_photos + bucket privado, open-dispute (contestar em vez de confirmar + pedido de reembolso nos 7 dias), congelamento na carteira/saque ("em análise"), resolve-dispute (admin, total/parcial, atômico). UI rodada 10 **opção B** (David, 2026-07-06): dois passos com chips de motivo + relato, fotos e revisão; entrada por link discreto "Algo deu errado?"; chat pausado durante a disputa
- [x] 2.4b Provas de conclusão do prestador + 3 camadas anti-punição (D-032, verificado e2e 7 checks): tela "Finalizar serviço" com fotos+relato opcionais (bucket imutável, horário do servidor é a prova), conclusão tardia só anexa provas, anunciante confirma direto do em-andamento (2 toques), job 12h pós-fim move para aguardando confirmação (pagamento nunca fica preso)
- [ ] 2.5 Painel admin do David (rota /admin no web, papel admin): fila de disputas com relato, fotos, chat, check-in e histórico; decisão com um clique
- [ ] 2.6 Notificações: central in-app primeiro (candidato novo, escolhido, serviço iniciado/concluído, pagamento liberado, disputa); push real requer build de desenvolvimento (EAS) — junto com a Fase 4/lojas
- [ ] 2.7 Prioridade para lesados por cancelamento (desenhar mecanismo — ex.: destaque na busca por N dias)
- [ ] 2.8 Busca por região (D-029): GPS + ajuste manual no mapa, raio ajustável padrão ~30 km, ordenação por proximidade com distância no cartão (do pino aproximado); localização do usuário nunca exibida

## Fase 3 — Pagamentos reais
- [ ] Gateway brasileiro (Mercado Pago/Pagar.me — a decidir, dúvida #13) com split; meios de pagamento: Pix + cartões no lançamento, carteiras digitais conforme o gateway (D-016, dúvida #17)
- [ ] Saque via Pix para conta bancária do prestador (avaliar outras opções de pagamento digital — dúvida #17)
- [ ] KYC / verificação de identidade
- [ ] Cobrança real da multa e da taxa da plataforma — incl. **cobrar no cartão do prestador** a multa de cancelamento (D-027) quando o saldo da carteira não cobrir

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
6. **Revisão jurídica** antes do lançamento (recomendação do Claude,
   2026-07-06 — não é aconselhamento jurídico): (a) termos de uso claros
   sobre o papel de intermediação, a multa de cancelamento (cláusula penal)
   e a taxa; (b) cláusula antidiscriminação na escolha/recusa de
   candidatos; (c) manter o desenho que evita vínculo empregatício (sem
   exclusividade, sem subordinação, prestador escolhe quando/onde
   trabalha); (d) na Fase 3, custódia de dinheiro real via gateway
   licenciado (split), nunca em conta própria; (e) LGPD: política de
   privacidade (dados pessoais + localização).
7. **Tiles do mapa**: o MVP usa OpenFreeMap (público, sem chave, sem SLA).
   Antes do lançamento, criar conta MapTiler (plano gratuito) e trocar
   `MAP_STYLE_URL` em `apps/mobile/src/components/location-map/config.ts`;
   revisar também o volume de geocodificação no Nominatim (política de uso
   justo — considerar um serviço pago se o volume crescer).

## Estado atual

**Última atualização:** 2026-07-06 — **Fase 1 completa; Fase 2 em andamento (2.1, 2.2 e 2.3 no ar)**

- **Backend real (Supabase) operacional e verificado e2e**: projeto
  `gexzpkbqodoyoxudzklb`, migrations 0001–0017 aplicadas, Edge Functions
  ATIVAS: `create-gig`, `update-gig`, `delete-gig`, `apply-gig`,
  `get-candidates`, `decide-candidacy`, `cancel-gig`, `gig-lifecycle`,
  `withdraw`; jobs pg_cron `expire-due-gigs` (5 min) e
  `auto-release-confirmations` (15 min). Google OAuth configurado.
  Credenciais públicas em `apps/mobile/.env.example`.
- **Fase 2 no ar**: auto-liberação em 48h (2.1), check-in por código
  (2.2) e endereço aproximado antes da escolha (2.3 — D-030:
  `gig_addresses` com RLS, região + pino deslocado 250–600 m, círculo no
  mapa). Próximos: 2.4 disputas, 2.5 painel admin (rodadas de design),
  2.6 notificações, 2.7 prioridade a lesados, 2.8 busca por região.
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
- **Candidatura multi-candidato (D-024) no ar**: gig_candidacies substitui
  gig_refusals e o pending_approval (legado); apply-gig + get-candidates
  (anonimizada) + decide-candidacy deployadas (respond-candidacy
  removida); vaga fica aberta juntando candidatos; anonimato garantido
  por RLS + função (sem worker_id no cliente); UI rodada 8 opção A.
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
- **Chat (D-025/D-026) no ar**: gig_messages + gig_message_reads
  (migrations 0013–0015), realtime habilitado; tela de conversa com
  respostas prontas, botão Conversar com contador de novas; a conversa
  ENCERRA na conclusão do serviço (envio cortado no banco, histórico
  legível — verificado e2e).
- **Filtro de busca por horário no ar**: chips de dia + hora na busca
  (sobreposição de horário), pré-seleção vinda do horário livre da agenda.
- **Multa do prestador (D-027) no ar**: cancel-gig aceita os dois lados —
  prestador que cancela paga 25% (piso R$ 10) da carteira (negativa no
  MVP; cartão na Fase 3), anunciante recebe o valor integral + 80% da
  multa; verificado e2e.
- **Paridade web verificada** (2026-07-06): 12 telas varridas em 1280px,
  sem quebras de layout.
- **Fase 1 completa.** Próximos: Fase 2 (denúncias/disputas — desenhar o
  processo com o David, dúvida #6; notificações push; painel admin) e as
  dúvidas abertas restantes (#2 percentual da taxa, #3, #4, #7, #8, #9,
  #10, #12, #20).
