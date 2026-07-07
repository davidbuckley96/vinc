# 07 — Dúvidas Abertas

> Questões que dependem de resposta do David. Ao serem respondidas, migram para
> `06-decisoes.md` e as specs afetadas são atualizadas.
> Prioridade: 🔴 bloqueia MVP · 🟡 bloqueia fase 2/3 · 🟢 pode esperar

## Produto / regras de negócio

1. ~~🔴 **Multa do anunciante**~~ ✅ Respondida em 2026-07-03: **25% do
   valor do prestador, piso de R$ 10; 80% para o prestador lesado, 20%
   para a plataforma** (ver `06-decisoes.md` D-018).
2. ~~🟡 **Taxa da plataforma**~~ ✅ Respondida em 2026-07-06: **10%
   oficial** (D-035; modelo já vinha de D-013 — paga pelo anunciante na
   criação, não reembolsável, prestador vê o líquido).
3. 🔴 **Conflito de agenda no aceite:** bloquear de vez o aceite conflitante ou
   apenas alertar fortemente?
4. ~~🔴 **Confirmação de conclusão**~~ ✅ Respondida em 2026-07-06:
   auto-liberação após **48h** (D-028).
5. ~~🟡 **Cancelamento pelo prestador**~~ ✅ Respondida em 2026-07-06:
   multa espelhada de 25% (piso R$ 10) restituindo o anunciante, cobrança
   no cartão na Fase 3 (ver `06-decisoes.md` D-027).
6. ~~🟡 **Denúncias/disputas/reembolsos**~~ ✅ Desenhado em 2026-07-06:
   David analisa num painel admin; relato obrigatório + fotos opcionais;
   reembolso total ou parcial limitado ao valor do serviço (D-028, docs/02
   §6). Fica ⚠️ calibrar com o uso as punições de má-fé reincidente.
7. ~~🟡 **Check-in do serviço**~~ ✅ Respondida em 2026-07-06: código de
   4 dígitos exibido pelo anunciante e digitado pelo prestador (D-028).
8. ~~🟢 **Endereço da vaga**~~ ✅ Respondida em 2026-07-06: só
   bairro/região (e pino aproximado) antes da escolha; completo para o
   prestador escolhido (D-028).
9. 🟢 **Lista inicial de categorias** e subcategorias (além de saúde,
   entretenimento e serviços domésticos).
10. 🟢 **Avaliações:** comentário textual além da nota? Avaliação é pública no
    perfil ou só a média?
18. ~~🟢 **Edição de vaga sem mudar o valor**~~ ✅ Confirmada em
    2026-07-06 pelo David: o valor NÃO pode ser alterado (D-017/D-027).
16. ~~🔴 **Prazo de processamento na carteira**~~ ✅ Respondida em
    2026-07-03: **7 dias**, inicialmente (ver `06-decisoes.md` D-016).
    Relaciona-se com a dúvida #4 (auto-liberação da confirmação) e com o
    processo de disputas (dúvida #6).

19. ~~🔴 **Escolha entre múltiplos candidatos**~~ ✅ Decidida em
    2026-07-06 pelo David: vaga fica aberta juntando candidatos e o
    anunciante escolhe um, vendo só dados anonimizados (ver
    `06-decisoes.md` D-024; spec docs/02 §3). Backend implementado e
    verificado e2e; UI na rodada 8.
20. 🟢 **Gênero no cartão do candidato** (D-024): David citou gênero como
    informação relevante na escolha, mas o cadastro ainda não coleta esse
    dado (não existe edição de perfil). Entra quando o perfil tiver o
    campo — decidir junto: obrigatório ou opcional? aparece sempre ou só
    quando o prestador quiser exibir?

## Design

11. ~~🔴 **Direção visual**~~ ✅ Respondida em 2026-07-02: Opção C, roxo
    "fintech" (ver `06-decisoes.md` D-005).
12. 🟢 **Nome/marca:** "Vinc" é definitivo? Há logo?

## Técnico / negócio

13. 🟡 **Gateway de pagamento** da Fase 3 — REDUZIDA em 2026-07-06
    (D-035): modelo A (subcontas/split), candidatos **Mercado Pago e
    Pagar.me**; desenvolvimento em sandbox desde já. Falta só a escolha
    CONTRATUAL, que depende do CNPJ (sem pressa — o adapter é trocável).
14. ~~🔴 **Contas de infraestrutura**~~ ✅ Resolvida em 2026-07-03: projeto
    Supabase criado, migrations aplicadas, Google OAuth configurado, `.env`
    preenchido e backend verificado e2e. Contas Apple Developer / Google
    Play ficam para a Fase 4.

15. ~~🟡 **Provedor de mapas/geocodificação**~~ ✅ Respondida em
    2026-07-06: **MapLibre GL + tiles abertos + Nominatim**, aprovado pelo
    David junto com a opção A da rodada 7 (ver `06-decisoes.md` D-023).
    Custo R$ 0 no MVP, sem cartão. Pendência derivada no checklist de
    pré-lançamento: trocar os tiles OpenFreeMap por MapTiler com chave
    própria.

17. 🟡 **Meios de pagamento e saque** (D-016 dá a direção; escolha final na
    Fase 3, junto com o gateway — dúvida #13): David quer as opções mais
    populares do Brasil — Pix, cartão de crédito e débito, Mercado Pago,
    PicPay etc. A pesquisa de mercado (2026-07-03) apontou: **Pix** é o
    meio dominante (~55% das transações no 2º semestre de 2025 e ~49% do
    e-commerce), **cartões** vêm em seguida (~30% das transações; crédito
    R$ 3,1 tri em 2025), e as **carteiras digitais** mais usadas/confiáveis
    são PayPal, Mercado Pago e PicPay (seguidas de PagBank e Google Pay).
    Direção atualizada em D-035 (2026-07-06): **lançamento Pix-only**
    (paga por QR, recebe na chave); cartões entram depois — e com eles a
    cobrança real da multa do prestador sem saldo (D-027). Carteiras
    digitais conforme o suporte do provedor contratado.

## Pendências de ação do David (não são dúvidas, são lembretes)

21. 🟡 **Criar a conta de desenvolvedor do Mercado Pago** em
    mercadopago.com.br/developers e enviar ao Claude o **Access Token de
    TESTE** (2026-07-06, David: "irei criar a conta futuramente, mas não
    me deixe esquecer"). Sem custo e sem CNPJ. Com ele, o Claude troca o
    dublê (`mp-mock`) pelo **sandbox oficial** (`MP_BASE_URL` +
    `MP_ACCESS_TOKEN`) e valida o fluxo Pix contra a infraestrutura real.
    ⚠️ O Claude deve RELEMBRAR o David disso ao fechar cada bloco da
    Fase 3 enquanto estiver pendente.
22. 🔴 **CNPJ** (bloqueia o 3.7 — produção): constituir a empresa e então
    contratar o provedor (decisão final Mercado Pago × Pagar.me, dúvida
    #13) com credenciais de produção.
