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
3. ~~🔴 **Conflito de agenda no aceite**~~ ✅ Respondida em 2026-07-09:
   **bloquear** (D-041; já era o comportamento implementado).
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
9. ~~🟢 **Lista inicial de categorias**~~ ✅ Aprovada em 2026-07-09:
   8 categorias + subcategorias + "Outros" (D-041; migration 0028,
   busca pelo pai inclui filhos).
10. ~~🟢 **Avaliações**~~ ✅ Respondida em 2026-07-09: **sem texto
    livre** — estrelas + elogios prontos, média pública por papel
    (D-041); comentários reavaliados pós-lançamento.
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
20. ~~🟢 **Gênero no cartão do candidato**~~ ✅ Encerrada em 2026-07-09:
    o campo foi **removido** (D-044 revoga D-043) — o nome sinaliza e
    evita desconforto/discriminação; dúvidas via chat. Ficam a tela
    Editar perfil (nome + bio) e a correção de segurança do grant por
    coluna (fecha escalonamento para is_admin).
23. ~~🟡 **Desistir da candidatura**~~ ✅ Respondida em 2026-07-09:
    aprovada a proposta + recandidatura permitida + dedup de notificação
    não lida + lista por relevância (ver `06-decisoes.md` D-039;
    implementado e verificado e2e).
24. ~~🔴 **Quando cobrar a taxa da plataforma**~~ ✅ Decidida em
    2026-07-09: David aprovou a **proposta completa** (docs/08 §5) —
    publicar grátis, Pix na escolha, taxa só no serviço realizado,
    anti-spam e promo de lançamento (ver `06-decisoes.md` D-040;
    implementado e verificado e2e nos dois modos).

### Abuso e integridade (proposta 2026-07-13, aguardando validação do David)

David pediu (2026-07-13) mais defesas contra abuso, começando pelo exemplo
de **telefone/links no anúncio** — que **já está no ar** (bloqueio de
contato em criar/editar vaga via `containsContactInfo`, D-040). Proposta de
próximas medidas, **aguardando o David marcar quais entram**:

- **10-a. Reforçar o bloqueio de contato**: pegar contato disfarçado
  (número por extenso, emojis/espaços entre dígitos, "arroba fulano") +
  aplicar o MESMO bloqueio na **bio do perfil** (hoje só no anúncio) +
  **aviso anti-golpe no chat** ("nunca combine/pague por fora"). Baixo esforço.
- **10-b. Uma conta por CPF**: impor unicidade do CPF (já coletado no
  cadastro — D-038) para fechar a criação de conta nova que foge de
  multa/suspensão/nota. Médio esforço, alto valor.
- **10-c. Suspensão automática por reincidência**: cancelamentos de última
  hora, no-shows ou denúncias procedentes acumuladas → tempo sem publicar/
  se candidatar. Médio esforço.
- **10-d. Termos proibidos na vaga** (drogas, armas, cunho sexual,
  discriminação) → bloqueio ou fila de revisão no painel. Baixo-médio esforço.
- **10-e. Anti auto-negócio (Sybil no mesmo serviço)**: impedir escolher um
  candidato que compartilha CPF/telefone com o anunciante (auto-elogio para
  lavar reputação). Mais complexo — provável 2ª leva.
- **10-f. Verificação por SMS no cadastro** (barra criação em massa): exige
  provedor de SMS + custo → junto do CNPJ/gateway.
- **10-g. OCR em imagens** (telefone escrito em foto): pesado → bem depois.

Recomendação do Claude para a 1ª leva: **10-a, 10-b, 10-c, 10-d**.

## Design

11. ~~🔴 **Direção visual**~~ ✅ Respondida em 2026-07-02: Opção C, roxo
    "fintech" (ver `06-decisoes.md` D-005).
12. ~~🟢 **Nome/marca**~~ ✅ Respondida em 2026-07-09: **"Vinc" é
    definitivo** (D-041); logo em escolha na rodada 16.

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
    Fase 3 enquanto estiver pendente. 2026-07-09: **bloqueado por ora** —
    a confirmação de telefone do MP exige chip brasileiro, que o David só
    terá mais adiante.
22. 🔴 **CNPJ** (bloqueia o 3.7 — produção): constituir a empresa e então
    contratar o provedor (decisão final Mercado Pago × Pagar.me, dúvida
    #13) com credenciais de produção.

23. 🟡 **Chave da API da Anthropic para a Vi** (D-045): criar uma chave em
    console.anthropic.com e enviar ao Claude para virar o secret de função
    `ANTHROPIC_API_KEY`. Com ela, a Vi troca o provedor `local`
    (recuperação da FAQ) pelo **Claude Haiku** (`claude-haiku-4-5`), com
    pt-BR melhor e sem treinar nos dados. Custo de centavos por conversa,
    sem exigir CNPJ. Até lá, a Vi já responde o comum pelo `local`.
