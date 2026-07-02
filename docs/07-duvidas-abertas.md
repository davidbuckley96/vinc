# 07 — Dúvidas Abertas

> Questões que dependem de resposta do David. Ao serem respondidas, migram para
> `06-decisoes.md` e as specs afetadas são atualizadas.
> Prioridade: 🔴 bloqueia MVP · 🟡 bloqueia fase 2/3 · 🟢 pode esperar

## Produto / regras de negócio

1. 🔴 **Multa do anunciante** (exclui vaga ou rejeita prestador pós-aceite):
   valor fixo ou % do serviço? Qual? Para onde vai a multa (plataforma,
   prestador lesado, ou dividido)?
2. 🔴 **Taxa da plataforma:** qual % sobre o valor do serviço? Descontada do
   prestador, acrescida ao anunciante, ou dividida?
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

## Design

11. 🔴 **Direção visual** (paleta, tipografia, tom da marca): será a primeira
    rodada de opções de design, antes de qualquer tela.
12. 🟢 **Nome/marca:** "Vinc" é definitivo? Há logo?

## Técnico / negócio

13. 🟡 **Gateway de pagamento** da Fase 3: Mercado Pago, Pagar.me ou outro?
    (depende de conta/credenciais do David)
14. 🟢 **Contas de infraestrutura:** projeto Supabase (org/conta do David),
    contas Apple Developer / Google Play para publicação (Fase 4).
