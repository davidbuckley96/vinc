# 07 — Dúvidas Abertas

> Questões que dependem de resposta do David. Ao serem respondidas, migram para
> `06-decisoes.md` e as specs afetadas são atualizadas.
> Prioridade: 🔴 bloqueia MVP · 🟡 bloqueia fase 2/3 · 🟢 pode esperar

## Produto / regras de negócio

1. 🔴 **Multa do anunciante** (exclui vaga ou rejeita prestador pós-aceite):
   valor fixo ou % do serviço? Qual? Para onde vai a multa (plataforma,
   prestador lesado, ou dividido)?
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
16. 🔴 **Prazo de processamento na carteira** (D-015, docs/02 §5.2): quantos
    dias entre a conclusão do serviço e o valor virar saldo sacável? É a
    janela para o anunciante pedir reembolso. Até a definição, a
    implementação usará **7 dias** como exemplo (mesmo espírito dos 10% da
    taxa). Relaciona-se com a dúvida #4 (auto-liberação da confirmação) e
    com o processo de disputas (dúvida #6).

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
    (docs/02 §2.1): Google Maps (o mais familiar; exige chave de API com
    cartão cadastrado, tem cota gratuita), Mapbox (cota gratuita generosa) ou
    OpenStreetMap/Nominatim (gratuito, visual menos polido). Recomendação
    será apresentada junto com a rodada de design do mapa.

17. 🟡 **Meios de saque além do Pix** (D-015, Fase 3): o saque para a conta
    do usuário será via Pix; avaliar que outras opções de pagamento digital
    oferecer (TED, carteiras como Mercado Pago/PicPay, etc.) quando o
    gateway real entrar (junto com a dúvida #13).
