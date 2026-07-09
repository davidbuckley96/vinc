# 08 — Pesquisa: quando cobrar a taxa (cold start × anúncios externos)

> Pesquisa feita em 2026-07-09 a pedido do David. Questão original: hoje o
> anunciante paga **valor + taxa na publicação** e, se a vaga expira sem
> ninguém, recebe de volta só o líquido — **a taxa fica com a plataforma**
> (D-013/D-022). No começo, com poucos usuários, muitas vagas vão expirar
> sem prestador: o anunciante sai no prejuízo da taxa, percebe a
> plataforma como "golpe", anuncia menos → menos vagas → menos
> prestadores → espiral de morte do cold start. David: *"a taxa deveria
> ser cobrada apenas se o serviço for finalizado"* — mas sem transformar
> o Vinc num mural de classificados/anúncios externos gratuitos.

## 1. Como os semelhantes cobram

| Plataforma | Publicar custa? | Quando o dinheiro entra | Quando a plataforma ganha | Quem paga a taxa |
|---|---|---|---|---|
| **GetNinjas** (BR) | Cliente: grátis. Profissional **compra moedas** para ver cada contato | Fora da plataforma | Na venda do **lead**, tenha ou não serviço | Profissional |
| **Thumbtack** (EUA) | Cliente: grátis. Profissional paga **por lead** | Fora da plataforma | No lead ("ponto de conexão"), mesmo se o cliente sumir | Profissional |
| **Triider** (BR) | Grátis | Cobrança na conclusão (pós-pago) | **Só no serviço encerrado** (16–25%) | Profissional |
| **Airtasker** (AUS) | **Grátis** | **Escrow na ESCOLHA do prestador** (cartão) | Só na atribuição/conclusão (10–20% do prestador + booking fee do cliente); cancelou depois de atribuir → devolve o valor, retém a connection fee | Ambos |
| **TaskRabbit** (EUA) | Grátis | Cobrança após o serviço | Só no serviço realizado; **multa de cancelamento < 24h** (1h de trabalho + taxas) | Cliente (fee em cima) |
| **Workana / 99Freelas** (LatAm/BR) | Grátis | **Escrow ao fechar contrato** | Só na conclusão (5–20%) | Freelancer |
| **Instawork / Wonolo / Qwick** (EUA, turnos — o mais parecido com o Vinc) | Grátis p/ trabalhador | Empresa paga por turno agendado | **Por turno realizado** (embutido na tarifa horária) | 100% o contratante |
| **Parafuzo / Singu** (BR, diaristas) | Grátis | Cartão: cobra **após o serviço**; Pix: no pedido | Só no serviço (15% do prestador) | Prestador |
| **Uber / iFood** | — | Na transação | **Só na transação realizada** | Embutida no preço |

### Lições que saltam da tabela

1. **Ninguém cobra para publicar a demanda.** O modelo mais próximo de
   "pagar sem garantia de serviço" é o de **leads** (GetNinjas/Thumbtack)
   — e é exatamente o mais odiado: Reclame Aqui e fóruns estão cheios de
   "paguei e o cliente nunca respondeu". É a versão espelhada do medo do
   David: pagar taxa por serviço que não aconteceu quebra a confiança.
2. **O padrão vencedor é: grátis anunciar; o dinheiro entra em escrow no
   MATCH; a plataforma só ganha quando o serviço acontece** (Airtasker,
   Workana, 99Freelas, Triider, TaskRabbit, Parafuzo, Uber/iFood).
3. **Multas pós-match são a proteção padrão** contra desistência (
   TaskRabbit cobra 1h + taxas se cancelar < 24h) — o Vinc já tem isso
   (D-018/D-027).
4. **Cold start:** a literatura (a16z, *The Cold Start Problem*) diz que
   2/3 dos marketplaces morrem pelo lado da OFERTA (prestadores) e que o
   subsídio temporário do lado difícil é a alavanca clássica — ex.: taxa
   zero de lançamento, bônus por primeiros serviços.
5. **Vazamento (fechar por fora)** é real — caso público do Parafuzo: a
   diarista termina cedo e propõe fechar as próximas **fora do app** por
   R$ 10 a mais. Mitigações da indústria: contato/endereço só após o
   match (o Vinc já faz — D-024/D-028/D-030), pagamento garantido como
   VALOR percebido, multas pós-match, moderação de texto (telefones/links
   no anúncio), denúncia fácil e recontratação em 1 toque dentro do app.
   Plataformas estimam perder de 30% a 80% da receita quando não cuidam
   disso.

## 2. Opções desenhadas para o Vinc

### Opção A — pagamento na publicação continua, mas 100% reembolsável até o match
Vaga continua nascendo com Pix de **valor + taxa** (D-035), mas se
**ninguém foi escolhido** (expira sem candidatos/sem escolha, ou o
anunciante exclui antes de escolher) a devolução é **TOTAL, taxa
incluída**. A taxa só é "ganha" pela plataforma quando o serviço
acontece (ou nas multas pós-match, como hoje).

- ✅ Resolve o prejuízo do anunciante e o "golpe" percebido; anunciar
  casualmente fica sem risco.
- ✅ Anti-spam/anti-ads preservado: publicar ainda TRAVA dinheiro real
  (R$ 110 por anúncio por dias) — classificado falso continua caro.
- ✅ Mudança mínima de código (regra de reembolso) e nenhuma mudança de
  fluxo para o usuário.
- ❌ A fricção do Pix antecipado continua existindo no primeiro contato.

### Opção B — publicar grátis; Pix na ESCOLHA do candidato (estilo Airtasker)
A vaga entra no ar sem pagamento; quando o anunciante escolhe alguém,
paga o Pix (valor + taxa) para confirmar a escolha.

- ✅ Convite máximo ao anúncio casual; zero dinheiro parado.
- ❌ Abre a porta para spam/ads externos e "vagas fantasma" (prestador se
  candidata, anunciante nunca paga) — frustra o lado que já é o mais
  difícil de reter.
- ❌ Põe uma etapa de pagamento no momento mais sensível (a escolha), e
  exige redesenhar o fluxo de candidatura/escolha.

### Opção C — Opção A + "taxa zero de lançamento"
Igual à A, com a taxa **zerada por tempo/número de serviços** no início
(subsídio de cold start clássico). O quadro da taxa vira propaganda:
"Taxa de serviço: R$ 0 durante o lançamento". Quando houver liquidez, a
taxa volta ao 10% (D-035) — avisada com antecedência.

- ✅ Ataca o cold start dos DOIS lados (anunciar barato → mais vagas →
  mais prestadores) sem mudar arquitetura (constante em `pricing.ts`).
- ❌ Receita zero durante a promoção (mas receita hoje já seria ~zero sem
  liquidez); risco de "dor da taxa" quando voltar.

## 3. Recomendação do Claude

**Opção A já** (é pequena, justa e alinhada ao que todo o mercado faz:
plataforma só ganha quando o serviço acontece) e **Opção C como decisão
de lançamento** (ativar a promo quando o app abrir ao público, com prazo
definido pelo David). A Opção B fica anotada como possível evolução
quando houver liquidez e moderação de conteúdo (filtro de telefone/link
em título/descrição — que vale implementar de qualquer forma).

Complementos anti-vazamento a manter/reforçar em qualquer opção:
contato e endereço exatos só após o match (já existe), multas pós-match
(já existem), filtro de contato em texto de anúncio (a fazer),
recontratação fácil (pós-MVP).

## 4. Fontes

- GetNinjas — reclamações de profissionais sobre leads pagos sem retorno:
  [Reclame Aqui — propaganda enganosa e leads inativos](https://www.reclameaqui.com.br/getninjas/reclamacao-sobre-propaganda-enganosa-leads-inativos-e-falta-de-suporte-do-getninjas_YlkNuIs_H22NJ7xv/),
  [Reclame Aqui — leads desbloqueados sem retorno](https://www.reclameaqui.com.br/getninjas/leads-desbloqueados-sem-retorno-prejuizo-financeiro-e-baixa-qualidade-dos-contatos-no-getninjas_4J5x28LTHFySltGr/),
  [estudo acadêmico (UFRJ) sobre o trabalho na GetNinjas](https://revistas.ufrj.br/index.php/rjur/article/download/41812/26735/137604)
- Thumbtack — cobrança por lead sem resposta:
  [fórum oficial — "why do we still have to pay"](https://community.thumbtack.com/discussion/1844/why-do-we-still-have-to-pay-for-a-lead-if-the-customer-isn-t-responding-back),
  [análise de custos de leads](https://savullc.com/thumbtack-pro-reviews/)
- Triider — taxa só no serviço encerrado (16–25%):
  [como recebo pelos serviços](https://triider.freshdesk.com/support/solutions/articles/43000156513-como-recebo-pelos-servicos-prestados-),
  [análise do modelo](https://codificar.com.br/triider/)
- Airtasker — grátis publicar, escrow na atribuição:
  [service fee](https://support.airtasker.com/hc/en-us/articles/200294499-What-is-the-service-fee),
  [fundos no cancelamento](https://support.airtasker.com/hc/en-us/articles/900003037266-What-happens-to-my-funds-when-the-task-gets-cancelled),
  [pricing & payments (poster)](https://support.airtasker.com/hc/en-au/articles/360020792111-Poster-information-about-pricing-and-payments)
- TaskRabbit — taxas e multa de cancelamento < 24h:
  [fees, payments & cancellation terms](https://support.taskrabbit.com/hc/en-us/articles/22213127341197-Fees-Payments-and-Cancellation-Supplemental-Terms),
  [cancellation policy](https://support.taskrabbit.com/hc/en-us/articles/46260411471899-Cancellation-Policy)
- Workana / 99Freelas — escrow no fechamento, comissão na conclusão:
  [comissão Workana](https://help.workana.com/hc/en-us/articles/360041235874-How-is-the-commission-calculated-at-Workana),
  [custos 99Freelas (cliente)](https://99freelas.zendesk.com/hc/pt-br/articles/360007908393-Quanto-custa-usar-o-99Freelas-Cliente),
  [como funciona 99Freelas](https://www.99freelas.com.br/como-funciona)
- Instawork / Wonolo / Qwick — contratante paga tudo, por turno:
  [Contrary Research — Instawork breakdown](https://research.contrary.com/company/instawork),
  [sidehusl — Instawork](https://sidehusl.com/instawork/)
- Parafuzo — cobrança pós-serviço no cartão; caso real de vazamento:
  [como funciona / cadastro](https://blu365.com.br/blog/parafuzo-cadastro/),
  [relato de proposta de fechar fora do app (Threads)](https://www.threads.com/@anaelisa.teixeira/post/DHrfXWTx4at/)
- Cold start / estratégia de marketplace:
  [a16z — The Cold Start Problem](https://a16z.com/books/the-cold-start-problem/),
  [a16z — Marketplace supply strategy](https://a16z.com/2021/03/31/marketplace-supply-strategy/),
  [Reforge — beat the cold start problem](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace)
- Vazamento/desintermediação:
  [Hagiu & Wright — Platform leakage](https://platformchronicles.substack.com/p/platform-leakage),
  [Sharetribe — how to prevent marketplace leakage](https://www.sharetribe.com/academy/how-to-discourage-people-from-going-around-your-payment-system/),
  [CometChat — platform leakage](https://www.cometchat.com/blog/platform-leakage)

## 5. Proposta completa para aprovação (2026-07-09; vira ADR se aprovada)

Pedido do David: proposta concreta do **padrão vencedor** (publicar
grátis + dinheiro no match + plataforma só ganha no serviço realizado),
incluindo o plano de cold start — "o marketplace não pode morrer ou
parecer vazio, mas deve ser orgânico".

### 5.1 Modelo de cobrança

1. **Publicar é grátis.** A vaga entra no ar sem Pix (morre o
   `pending_payment` na criação; a tela de anúncio perde a etapa de
   pagamento). Anunciar casualmente vira um convite — zero risco, zero
   dinheiro parado.
2. **O Pix acontece na ESCOLHA do candidato.** Ao tocar "Escolher", o
   anunciante paga **valor + taxa** na tela de pagamento que já existe
   (QR/copia-e-cola do 3.2). A escolha fica interna como "aguardando
   pagamento" por um prazo curto (**30 minutos**, prorrogável a gosto):
   - Pix caiu → escolha efetivada: agenda do prestador bloqueada, código
     de check-in gerado, endereço exato e chat liberados, notificação
     "você foi escolhido".
   - Pix não caiu → escolha desfeita sozinha (job agendado), a vaga
     segue aberta com os candidatos.
   - **O candidato só fica sabendo DEPOIS do pagamento confirmado** —
     "vaga fantasma" não frustra ninguém, porque ninguém é avisado de
     uma escolha não paga.
3. **A taxa só é ganha quando o serviço acontece.** Expirou sem escolha
   → nada foi cobrado. Excluiu antes de escolher → nada. Multas
   pós-pagamento (anunciante cancela / prestador cancela) seguem
   D-018/D-027; disputas seguem D-028/D-031. O escrow ("pagamento
   garantido pelo app") continua existindo do momento da escolha em
   diante — o prestador nunca trabalha sem o dinheiro já retido.

### 5.2 Anti-spam / anti-anúncio externo (substitui o papel do Pix na entrada)

- **Filtro de contato no anúncio**: telefone, e-mail e links em
  título/descrição são bloqueados na criação (client + server), com
  mensagem educada ("o contato acontece pelo app depois da escolha").
- **Limite de vagas abertas simultâneas**: 3 para contas sem nenhum
  serviço concluído; sobe com histórico (ex.: 10). Freia robôs e
  anunciantes de má-fé sem atrapalhar uso real.
- **Denunciar vaga** (1 toque no detalhe) + remoção pelo painel admin.
- **1 CPF = 1 conta** (D-038 já garante) — spam não escala.
- **Endereço exato e chat só depois do pagamento** (já existe): um
  anúncio externo não tem como entregar o contato do anunciante.

### 5.3 Cold start (orgânico, sem conteúdo falso)

- **Promo de lançamento "taxa R$ 0"**: taxa zerada por um período/nº de
  serviços definido pelo David (sugestão: 3 primeiros meses), estampada
  no quadro da taxa ("Lançamento: taxa grátis"). Sem liquidez a receita
  seria ~zero de qualquer jeito — o custo real é nulo e o argumento de
  marketing é o mais simples possível. A volta da taxa é avisada com
  antecedência dentro do app.
- **Lançamento por região** (atomic network, a16z): concentrar a
  divulgação numa cidade/bairro por vez até haver densidade — a busca
  por região (2.8) já dá o recorte. Melhor 1 bairro vivo que 1 país
  vazio.
- **Empty states que convidam em vez de constranger**: sem vagas na
  região → "Seja o primeiro a anunciar aqui" + botão direto; vaga sem
  candidatos há X horas → dica automática ao anunciante (ajustar
  valor/horário). Nunca conteúdo falso.
- **Semear com demanda real**: primeiras vagas reais do David/conhecidos
  na região de lançamento; o Destaque (D-034) e as notificações já
  cuidam da retenção do prestador.

### 5.4 O que muda de código (estimativa: ~2 blocos)

`create-gig` sem cobrança; `decide-candidacy` (choose) cria a cobrança e
um estado interno "escolha aguardando pagamento" (reusa `gig_payments`,
`payment-webhook` e a tela `/pay`); job agendado desfaz escolhas não
pagas em 30 min; notificação `chosen` movida para o pós-confirmação;
filtro de contato + limite de vagas + denúncia de vaga. Os fluxos de
multa/disputa/liberação/saque (Fase 2 e 3) não mudam.

### 5.5 Riscos e resposta

| Risco | Resposta |
|---|---|
| Anunciante escolhe e não paga | Escolha expira em 30 min; candidato nunca soube; vaga segue aberta |
| Spam/ads externos (publicar ficou grátis) | §5.2 (filtro de contato + limites + denúncia + CPF único + contato só pós-pagamento) |
| Fechar por fora depois do match | Já mitigado: multas (D-018/D-027), escrow como valor, chat monitorável; recontratação fácil pós-MVP |
| Perda do "compromisso" do dinheiro na entrada | O compromisso real continua onde importa: ninguém trabalha sem escrow; antes do match não havia compromisso mesmo |
