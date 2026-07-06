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
5. ~~🟡 **Cancelamento pelo prestador**~~ ✅ Respondida em 2026-07-06:
   multa espelhada de 25% (piso R$ 10) restituindo o anunciante, cobrança
   no cartão na Fase 3 (ver `06-decisoes.md` D-027).
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

13. 🟡 **Gateway de pagamento** da Fase 3: Mercado Pago, Pagar.me ou outro?
    (depende de conta/credenciais do David)
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
    Direção registrada em D-016: lançar com **Pix + cartões** via gateway e
    adicionar carteiras conforme o suporte do gateway escolhido. Falta:
    escolher o gateway e confirmar o leque exato no lançamento.
