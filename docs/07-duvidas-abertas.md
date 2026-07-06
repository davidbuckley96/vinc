# 07 — Dúvidas Abertas

> Questões que dependem de resposta do David. Ao serem respondidas, migram para
> `06-decisoes.md` e as specs afetadas são atualizadas.
> Prioridade: 🔴 bloqueia MVP · 🟡 bloqueia fase 2/3 · 🟢 pode esperar

## Produto / regras de negócio

1. ~~🔴 **Multa do anunciante**~~ ✅ Respondida em 2026-07-03: **25% do
   valor do prestador, piso de R$ 10; 80% para o prestador lesado, 20%
   para a plataforma** (ver `06-decisoes.md` D-018).
2. 🟡 **Taxa da plataforma:** o MODELO foi decidido (D-013: paga pelo
   anunciante na criação, não reembolsável, prestador vê o líquido). Falta
   definir o **percentual/fórmula** — 10% está em uso como exemplo.
3. 🔴 **Conflito de agenda no aceite:** bloquear de vez o aceite conflitante ou
   apenas alertar fortemente?
4. 🔴 **Confirmação de conclusão:** se o anunciante não confirmar nem contestar,
   liberar pagamento automaticamente após quanto tempo (24h? 48h?)?
5. 🟡 **Cancelamento pelo prestador:** regras exatas da punição (queda de
   prioridade? suspensão após N cancelamentos? janela de cancelamento sem
   punição logo após o aceite?).
6. 🟡 **Denúncias/disputas/reembolsos** (parte mais complexa, reconhecida pelo
   David como ainda não resolvida): quem analisa no início (o próprio David
   como admin?), quais evidências (fotos, descrição), prazos, consequências
   para denúncias procedentes e improcedentes, limite de reembolso.
7. 🟡 **Check-in do serviço:** como marcar início/fim (botão simples dos dois
   lados? geolocalização? código de confirmação?).
8. 🟢 **Endereço da vaga:** mostrar endereço completo só após o aceite e apenas
   bairro/região antes? (recomendação de segurança)
9. 🟢 **Lista inicial de categorias** e subcategorias (além de saúde,
   entretenimento e serviços domésticos).
10. 🟢 **Avaliações:** comentário textual além da nota? Avaliação é pública no
    perfil ou só a média?
18. 🟢 **Edição de vaga sem mudar o valor** (D-017): implementei a edição da
    vaga aberta permitindo mudar tudo MENOS o valor (que está amarrado ao
    pagamento da criação; para outro valor: excluir, receber o líquido de
    volta e recriar). Confirma essa regra, ou quer permitir mudar o valor
    com ajuste de cobrança/reembolso da diferença?
16. ~~🔴 **Prazo de processamento na carteira**~~ ✅ Respondida em
    2026-07-03: **7 dias**, inicialmente (ver `06-decisoes.md` D-016).
    Relaciona-se com a dúvida #4 (auto-liberação da confirmação) e com o
    processo de disputas (dúvida #6).

## Design

11. ~~🔴 **Direção visual**~~ ✅ Respondida em 2026-07-02: Opção C, roxo
    "fintech" (ver `06-decisoes.md` D-005).
12. 🟢 **Nome/marca:** "Vinc" é definitivo? Há logo?

## Técnico / negócio

13. 🟡 **Gateway de pagamento** da Fase 3: Mercado Pago, Pagar.me ou outro?
    (depende de conta/credenciais do David)
14. ~~🔴 **Contas de infraestrutura**~~ ✅ Resolvida em 2026-07-03: projeto
    Supabase criado, migrations aplicadas, Google OAuth configurado, `.env`
    preenchido e backend verificado e2e. Contas Apple Developer / Google
    Play ficam para a Fase 4.

15. 🟡 **Provedor de mapas/geocodificação** para a localização por mapa
    (docs/02 §2.1). Rodada de design: `docs/design/rodada-07-mapa.html`.
    **Recomendação do Claude (2026-07-06): MapLibre + MapTiler + Nominatim**
    — custo R$ 0 no MVP, sem cartão de crédito: MapLibre GL é open-source e
    roda com um só código na web e no app (`maplibre-react-native` +
    `maplibre-gl-js`); MapTiler serve os mapas (plano gratuito ~100 mil
    visualizações/mês, só pede cadastro); Nominatim (OpenStreetMap) faz a
    busca de endereço gratuitamente. Alternativas: Google Maps (visual mais
    familiar, mas exige cartão cadastrado e NÃO roda na web com a mesma
    biblioteca do app — duas implementações) e Mapbox (bom, mas também pede
    cartão). Trocar de provedor depois é barato se o código isolar o mapa
    num componente próprio (princípio de docs/03).

17. 🟡 **Meios de pagamento e saque** (D-016 dá a direção; escolha final na
    Fase 3, junto com o gateway — dúvida #13): David quer as opções mais
    populares do Brasil — Pix, cartão de crédito e débito, Mercado Pago,
    PicPay etc. A pesquisa de mercado (2026-07-03) apontou: **Pix** é o
    meio dominante (~55% das transações no 2º semestre de 2025 e ~49% do
    e-commerce), **cartões** vêm em seguida (~30% das transações; crédito
    R$ 3,1 tri em 2025), e as **carteiras digitais** mais usadas/confiáveis
    são PayPal, Mercado Pago e PicPay (seguidas de PagBank e Google Pay).
    Direção registrada em D-016: lançar com **Pix + cartões** via gateway e
    adicionar carteiras conforme o suporte do gateway escolhido. Falta:
    escolher o gateway e confirmar o leque exato no lançamento.
