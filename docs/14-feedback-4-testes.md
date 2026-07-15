# 14 — Roadmap do 4º ciclo de testes (feedback do David)

> Feedback do David testando o app (2026-07-15). Cada item foi **investigado no
> código** (causa-raiz real, não palpite) antes de virar plano. Itens marcados
> com 🟠 **precisam de decisão sua** (regra de negócio / UI-UX) antes de eu
> implementar; os demais eu resolvo de forma autônoma. `arquivo:linha` e esforço
> (S/M/L) em cada um.

## Índice rápido

| # | Item | Tipo | Precisa decisão? | Esforço |
|---|---|---|---|---|
| F-01 | Pix ao escolher não aparece | comportamento | 🟠 sim | S |
| F-02 | Aba de mensagens (inbox estilo WhatsApp) | feature/UI | 🟠 sim (UI) | M |
| F-03 | Push de novas mensagens (com prévia) | feature | parcial | M |
| F-04 | Não iniciar serviço antes da hora (código 30 min antes) | regra | 🟠 confirmar nº | M |
| F-05 | Não finalizar logo após iniciar (mín. ~30 min) + reportar problema | regra | 🟠 confirmar nº | M |
| F-06 | Tirar foto no app (câmera) na conclusão | feature/UI | não | S |
| F-07 | Botão de finalizar não funciona com foto/comentário | **bug** | não | S |
| F-08 | Sistema de logs + observabilidade num dashboard | infra | 🟠 sim (abordagem) | L |
| F-09 | Falar com suporte na tela de conclusão | feature | não | S |
| F-10 | Botão de reembolso não funciona com foto/comentário | **bug** | não | S |
| F-11 | "Pagamento liberado" some/reetiqueta quando há contestação | **bug** (display) | não | M |
| F-12 | Nota decimal + algoritmo justo p/ novo usuário | regra/algoritmo | 🟠 sim (escolher) | M |

---

## Bugs (resolvo sozinho — causa-raiz confirmada)

### F-07 + F-10 · Botão morto ao anexar foto — ✅ CORRIGIDO (falta build p/ confirmar)
**Mesma causa nos dois.** O upload lê a imagem com `fetch(uri).blob()`
(`features/services/hooks.ts:53-56` e `features/disputes/hooks.ts:47-49`), idioma
**quebrado no React Native** (lê 0 bytes / rejeita). O erro é **engolido** porque
o `submit` faz `await mutateAsync(...)` sem `try/catch` e a mutation não tem
`onError` (`complete-service-screen.tsx:65-73`, `dispute-screen.tsx:96-104`) → a
promessa rejeita, o `if/else` não roda, e o botão fica um no-op. Sem foto, o loop
de upload não roda e funciona. O mesmo idioma afeta o **avatar** (`profile/hooks.ts:82`),
que hoje falha em silêncio ("a foto não mudou").
**Correção:** pedir `base64: true` no `expo-image-picker` e subir `Buffer.from(base64)`
(as funções de upload já aceitam `ArrayBuffer`); envolver os dois `submit` em
`try/catch` que mostra o `network_error` já existente. — **S**

### F-11 · "Pagamento liberado" aparece junto com "contestado" — ✅ CORRIGIDO (falta build)
O "liberado" é um evento **real** (`escrow_release`): o pagamento foi liberado
(confirmação ou 48h) e depois **re-congelado** por um pedido de reembolso dentro
da retenção de 7 dias. A carteira em si está certa ("em análise pela plataforma",
`wallet-screen.tsx:220`). O problema é só na **central de notificações**
(`notifications/labels.ts:34,38`, `notifications-screen.tsx:83-127`), que mostra a
linha antiga "liberado" sem marcar que foi superada.
**Correção (display):** quando existe um `dispute_opened` posterior para a mesma
vaga **sem** `dispute_resolved` a favor do trabalhador, esconder/reetiquetar o
`payment_released` ("liberação pausada — em análise"). Sem migração; só exibição.
— **M**

## Features sem decisão (resolvo sozinho)

### F-06 · Tirar foto no app na conclusão — ✅ CORRIGIDO (falta build)
Ao tocar em "adicionar foto" na conclusão agora abre um menu **"Tirar foto /
Escolher da galeria"**; "tirar foto" usa a câmera do sistema (`launchCameraAsync`,
sem lib nova) com pedido de permissão. Adicionadas as permissões de câmera/fotos
no `app.json` (plugin `expo-image-picker`) — exige rebuild. — **S**

### F-09 · Falar com suporte na tela de conclusão — ✅ CORRIGIDO (falta build)
Link discreto "Algum problema para finalizar? Falar com o suporte" no rodapé da
tela de conclusão → `/help` (Central de Ajuda + "Vi"). — **S**

## Itens que precisam da sua decisão 🟠

### F-01 · Pix ao escolher o trabalhador — **é intencional (modo MVP)**
Não é bug: o provedor de pagamento está em `simulated`, que **confirma na hora** e
pula a tela de QR (`_shared/payment-provider.ts:84-112`, `decide-candidacy/index.ts:157-173`).
Todo o fluxo Pix real já existe (D-040) e aparece quando o provedor é
`mercadopago`. **Decisão:** (a) manter simulado até o gateway real (recomendado
pro MVP); (b) mostrar uma tela de "pagamento simulado" (confirmação visível) mesmo
no modo demo; (c) já ligar o Mercado Pago sandbox pra ver o QR de verdade.

### F-04 + F-05 · Travas de tempo no ciclo do serviço
Hoje **nada olha o relógio** — o controle é só por `status`. O código de check-in é
gerado na escolha (dias antes) e revelado sem trava (`_shared/choice.ts:112`,
`agenda.ts:85-92`), e nem iniciar nem finalizar comparam com o horário
(`gig-lifecycle/index.ts:112,126`). Por isso deu pra iniciar amanhã e finalizar na
hora. Plano (tudo **no servidor**, porque trava só no app não segura):
- Revelar o código e permitir **iniciar** só a partir de ~30 min antes de `starts_at`
  (RLS em `gig_checkin_codes` + trava no `gig-lifecycle`).
- Permitir **finalizar** só ~30 min após o **início real** (precisa de uma coluna
  nova `started_at`, que não existe hoje).
- **Reportar problema durante o serviço** → abre ticket de suporte (infra já existe,
  docs/09); o suporte pode **forçar a conclusão** antes da hora (nova ação no painel).

🟠 **Confirmar os números** (assumi pelo seu texto): código/início **30 min antes**;
duração mínima antes de finalizar **30 min**. E: a trava de 30 min vale só pro
"finalizar" do trabalhador, ou também pro "confirmar" do anunciante? (sugiro: só do
trabalhador — confirmar antes é bom pro trabalhador). — **M**

### F-02 · Aba de mensagens (inbox estilo WhatsApp)
O chat já existe (1 conversa por vaga, `0013_gig_messages.sql`), mas só se chega a
ele **abrindo a vaga** (`service-detail-screen.tsx:308`) — não há aba nem inbox. O
inbox lê de uma lista que já existe (`fetchMyAgenda`) + última mensagem/não-lidas.
Plano: nova **aba "Mensagens"** + tela de lista → abre o chat existente
(`/chat/${gigId}`), sem mexer no chat. 🟠 Como é UI nova, sigo a regra do projeto e
te trago **2–3 opções de layout** (rodada de design) antes de implementar.
Observação de regra: o chat só existe **depois da escolha** (anonimato, D-024) e é
cortado na conclusão (D-026) — o inbox lista essas conversas; "conversar antes de ir
à vaga" = ter a lista, não chat antes da escolha. — **M**

### F-03 · Push de novas mensagens (com a última mensagem)
Reaproveita o `dispatch_push` existente: um trigger em `gig_messages` cria uma
`notification` (novo tipo `new_message`) pro destinatário → push. Pra mostrar o
texto ("Nome: última mensagem") o `send-push` precisa carregar o corpo; anti-spam:
não empilhar se já existe um `new_message` não lido daquela vaga. Depende do F-02
existir. — **M**

### F-08 · Logs + observabilidade num dashboard
Hoje há `console.*` nas Edge Functions (vai pros logs do Supabase) e o plano de
observabilidade está em `docs/10`, mas não há captura de erros do **app** nem um
painel. 🟠 **Decisão de abordagem:**
- (a) **Sentry** (ou similar) — captura erros de app + backend, dashboard pronto,
  plano grátis; menos trabalho, dependência externa.
- (b) **Caseiro no Supabase** — tabela `app_logs` + Edge Function de ingestão +
  painel admin simples; sem dependência, mais trabalho e menos recursos.
- (c) Só estruturar os logs do backend agora (JSON + níveis) e deixar o painel pra
  depois. — **L**

### F-12 · Nota decimal + algoritmo justo (proteção do novo usuário)
Achados: a média **já é decimal** no banco (`round(avg,2)` na view `profile_stats`)
e o app já mostra 1 casa (`profile-view.tsx:71`). O "de 5 pra 2" acontece porque o
**5 é só um placeholder de exibição** pra quem tem 0 avaliações (D-061) — não há
avaliação "semente"; a 1ª nota real (2) vira média 2,00. Ou seja: uma nota baixa
cedo "destrói" a conta, exatamente sua preocupação.
**Solução (pesquisada):** média **bayesiana** na view `profile_stats`:
`nota = (C·m + Σnotas) / (C + n)`, onde `m` = nota-prior e `C` = peso do prior
(quantas "avaliações fantasma"). Assim, com poucas avaliações a nota fica perto do
prior e vai convergindo pra real conforme chegam avaliações — um 5→2 com 1 review
cai pra ~4,5 em vez de 2,0. Fica tudo derivado na view (sem coluna guardada).
🟠 **Escolher os parâmetros** (te trago no AskUserQuestion): quão protetor
(`C` alto = protege mais/converge devagar) e qual `m`. Opcional: um componente de
**meia-estrela** (hoje mostra "★ 3,5" como número). — **M**
Fontes: [Evan Miller — Bayesian Average Ratings](https://www.evanmiller.org/bayesian-average-ratings.html),
[Building Niche — Bayesian Averages for User Reviews](https://building.niche.com/using-bayesian-averages-for-user-reviews-2cb42fbb795e).

---

## Ordem sugerida

1. **Bugs primeiro:** F-07/F-10 (foto), F-11 (notificação) — resolvo já.
2. **Travas de tempo** F-04/F-05 (com seus números) — servidor, dá pra testar aqui.
3. **F-12 nota** (com sua escolha de parâmetros) — servidor, testável.
4. **F-06/F-09** (câmera + suporte na conclusão) — entram no mesmo build.
5. **F-02/F-03** (inbox + push de mensagem) — rodada de design antes.
6. **F-08** (observabilidade) — conforme a abordagem escolhida.
7. **F-01** — conforme sua decisão (provavelmente manter simulado no MVP).
