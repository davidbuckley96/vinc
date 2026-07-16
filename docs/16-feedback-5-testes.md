# 16 — Roadmap do 5º ciclo de testes (feedback do David)

> Feedback do David (2026-07-16), cada item **investigado no código** (causa-raiz
> real). 🟠 = precisa de decisão sua antes de implementar; os demais eu resolvo
> autônomo. `arquivo:linha` e esforço (S/M/L).

## Índice

| # | Item | Tipo | Decisão? | Esforço |
|---|---|---|---|---|
| G-01 | Voltar quebrado após criar vaga | bug | não | S |
| G-02 | Abas de baixo sempre visíveis | UX | 🟠 abordagem | L |
| G-03 | Mapa da criação: zoom/pino "pulam" de volta (só anunciante) | bug | não | S-M |
| G-04 | Editar local mostra endereço antigo até reiniciar | bug | não | S |
| G-05 | Câmera estilo WhatsApp em todo lugar que usa foto | feature/UI | 🟠 confirmar | M-L |
| G-06 | Mudar nome não reflete (fonte única de verdade) | bug | não | S-M |
| G-07 | Card da inicial (topo) não faz nada | bug | não | S |
| G-08 | Tirar aba "Perfil" → acessar via botão do topo (+ configurações) | UX | 🟠 sim | M |
| G-09 | Local salvo mesmo cancelando (só devia no "confirmar") | bug | não | S-M |
| G-10 | Não dá pra clicar na localização aproximada (intermitente) | bug | não | M |
| G-11 | Furo do trabalhador (passou a hora, não iniciou) | backend/regra | 🟠 sim | M-L |
| G-12 | Vi trava o usuário na fila do suporte | bug/feature | não | S-M |
| G-13 | Vaga imutável quando há candidato (botão editar desativado) | regra/UI | não | S |
| G-14 | Card do topo mostra a inicial em vez da foto de perfil | bug | não | S |

---

## Bugs (resolvo autônomo — causa-raiz confirmada)

### G-01 · Voltar quebrado após criar vaga
`post-screen.tsx:80` faz `router.replace('/gig/${id}')`. Como `post` é uma aba e
`gig/[id]` é rota-irmã das abas, o `replace` **apaga a pilha** — não há pra onde
voltar (nem botão do header nem o físico). **Correção:** `router.push` no lugar
de `replace` (o form já reseta sozinho pelo `formKey`). — **S**

### G-03 · Mapa da criação: zoom e pino "pulam" de volta (só no anunciante)
Laço de realimentação: no seletor, `onCenterChange={moved}` faz `setCenter(...)`
a cada gesto (`location-picker.tsx:207,119`), o que muda as props do mapa; o
efeito de recentragem (`location-map.tsx:81-92`) compara com `lastPushed`, que
**não é atualizado no pan do usuário** (`onMessage`, `:108-117`), então acha que
é mudança externa e dispara `jumpTo` — puxando o mapa de volta. E o zoom nunca é
"devolvido" (`moveend` só manda lat/lng), então a recentragem reaplica o zoom 16
da busca. Por isso só acontece no seletor (o mapa do trabalhador usa
`onCenterChange={()=>{}}`, sem realimentação → fluido). **Correção:** atualizar
`lastPushed` no `onMessage` e devolver o zoom no `moveend`. — **S-M**

### G-04 · Editar local mostra endereço antigo até reiniciar
A tela do anunciante (`ServiceDetailScreen`) lê a query `['service', gigId,…]`
(`services/hooks.ts:26`), mas `useUpdateGig.onSuccess` só invalida `['gigs']` e
`['agenda']` (`gigs/hooks.ts:243-249`). **Correção:** invalidar também
`['service']`. — **S**

### G-06 · Mudar nome não reflete em lugar nenhum (fonte única)
A saudação "Olá, {nome}" lê do **`user_metadata` do login** (gravado só no
cadastro), enquanto a edição grava em `profiles.name` — **duas fontes de
verdade**; nem reiniciar resolve, porque o metadata fica no token. **Correção:**
ler o nome sempre de `profiles.name` (via `useMyProfile`) na saudação, avatar,
welcome e no rascunho de vaga; e **ampliar as invalidações** de
`useUpdateProfile`/`useUploadAvatar` (`['gigs']`, `['agenda']`, `['conversations']`,
`['candidates']`, `['my-activity']`) pra propagar em tudo sem reiniciar. — **S-M**

### G-07 · Card da inicial (topo) não faz nada
`agenda-screen.tsx:76` é um `View` sem `onPress`. **Correção:** virar `Pressable`
→ perfil (casa com o G-08). — **S**

### G-09 · Local salvo mesmo cancelando
O `onClose`/voltar **não** commita (só `onConfirm` chama `setLocation`). O bug: o
`LocationPicker` semeia o estado interno do `initial` **uma vez** e **nunca
reseta** ao reabrir/cancelar (`location-picker.tsx:52-68`); a posição movida-mas-
cancelada persiste e, na reabertura, aparece como se confirmada. **Correção:**
resetar o estado interno pro `initial` ao (re)abrir (effect por `visible` ou
`key`). — **S-M**

### G-10 · Não dá pra clicar na localização aproximada (intermitente)
`update-gig` **sobrescreve** `area` e `approx_lat/lng` de forma diferente do
`create-gig`: ignora `draft.area`, não usa o centroide do bairro, e **zera** o
`approx` quando a edição não traz pino novo (`update-gig/index.ts:106-121`). Com
`approx` nulo, o link do mapa some (a UI só mostra se `approxLat/Lng` != null) e o
`area` vira o rótulo genérico. É intermitente porque só acontece quando a edição
"perde" o pino. **Correção:** o `update-gig` espelha o `create-gig` (prefere
`draft.area`, usa `neighbourhoodCenter`, e **preserva** os valores existentes em
vez de zerar) + carregar `area`/lat/lng no caminho de edição do cliente. — **M**

### G-13 · Vaga imutável quando há candidato
O **banco já bloqueia** editar conteúdo com candidaturas `pending`/`chosen`
(trigger `0041` + `update-gig`). Falta na **UI**: desabilitar o botão de editar
quando há candidato **ou** a vaga já está fechada (alguém escolhido), e reabilitar
quando não há ninguém — com um aviso do porquê. **Correção:** o detalhe da vaga
do dono recebe a contagem de candidatos ativos e desabilita o botão conforme a
regra. — **S** · ✅ **Feito** (`service-detail-screen.tsx`: `useCandidates`
gate + aviso; a vaga fechada já cai no `posterCanEdit === false`).

### G-14 · Card do topo mostra a inicial em vez da foto
O avatar do topo (`agenda-screen.tsx:78`) sempre desenha a **inicial do nome**;
nunca usa o `avatar_url`. **Correção:** mostrar a foto quando existir (cai no
mesmo hook de fonte única do G-06, então também atualiza ao trocar a foto). Casa
com o G-07 (virar `Pressable`) e o G-08. — **S**

## Precisam da sua decisão 🟠

### G-02 · Abas de baixo sempre visíveis
Hoje as telas de detalhe (vaga, serviço, chat, perfil…) são **irmãs** das abas no
Stack raiz, então cobrem a barra. Pra manter a barra sempre visível é preciso
**reestruturar as rotas dentro das abas** (um Stack aninhado por aba). É o item
mais pesado e mexe na árvore de rotas do app todo. 🟠 **Decisão:** (a) fazer a
reestruturação completa agora (melhor navegação, mais risco/tempo); (b) só
corrigir os "becos sem saída" (G-01 + garantir que todo detalhe tem voltar) e
deixar a barra-sempre-visível pra uma fase dedicada. — **L**

### G-05 · Câmera estilo WhatsApp em tudo que usa foto
Hoje: conclusão de serviço tem um menu "Tirar foto / Galeria" (que eu adicionei),
mas o **perfil** abre só a galeria; e você quer o **modelo WhatsApp** (câmera com
botão de captura + tira de fotos recentes + galeria na mesma tela) em **todos** os
pontos de foto (perfil, conclusão, disputa). 🟠 **Confirmar a abordagem:**
(a) **componente próprio estilo WhatsApp** (câmera ao vivo + recentes + galeria numa
tela só) — precisa de `expo-camera` + `expo-media-library`, é o que você pediu,
mais trabalho; (b) usar a **câmera do sistema** (abre o app de câmera, tira, volta)
+ galeria via menu — mais simples, mas não é a tela única do WhatsApp. Recomendo
(a) já que você foi específico. **Obrigatório:** te mando uma captura do design. — **M-L**

### G-08 · Tirar aba "Perfil" → botão do topo (+ configurações)
Remover a aba "Perfil" de baixo; o avatar do topo (G-07) abre o **perfil**, que já
tem as opções (editar, alertas, Pix, ajuda). Você também quer **configurações e
outras opções de menu** ali — hoje **não existe uma tela de Configurações**
separada (as opções moram como linhas no perfil). 🟠 **Decisão:** confirmo que
removo a aba Perfil e ligo o avatar ao perfil; e faço uma **rodada de design** do
menu do topo (perfil + configurações + o que mais você quiser: tema, notificações,
sair, termos…) — me diga o que deve ter em "configurações". — **M** (+ design)

### G-11 · Furo do trabalhador (passou a hora e não iniciou)
Hoje **não há nada** que detecte. A vaga fica presa em `accepted` pra sempre, o
dinheiro (cobrado na escolha) fica **congelado**, o anunciante **não consegue
pedir reembolso** (disputa só abre em `awaiting_confirmation`/`completed`) e o
suporte não tem ferramenta. Quem paga o pato é o **anunciante**. Já existe a
coluna `started_at` (do G-04… não, da migração 0047) pra detectar. 🟠 **Decisão de
regra:** quando o serviço não começa até X depois do horário combinado:
- **Reembolso ao anunciante?** (recomendo: sim, integral — ele não recebeu nada);
- **Penalidade ao trabalhador?** (recomendo: registrar uma "falta"/offense, que já
  existe no anti-abuso, contando pra suspensão por reincidência);
- **Prazo de tolerância** antes de considerar furo (ex.: `ends_at` da vaga, ou
  `starts_at + N horas`?). Sugiro esperar até o `ends_at` (o serviço não pode mais
  acontecer) antes de reembolsar automaticamente.
Detecção é um job novo (M); a resolução (reembolso + offense + novo status) é M-L e
depende dessa regra. — **M-L**

## G-12 · Vi trava o usuário na fila do suporte (resolvo autônomo)
Achados: a **Vi é baseada em regras** (casa palavras-chave contra artigos de FAQ e
responde com o texto do artigo; só usa IA — Claude Haiku — se uma chave de API for
ligada). O bug: quando ela **encaminha pro suporte** (`waiting_support`), o backend
para de responder (`support-assistant/index.ts:154-161` devolve vazio) e o app
reabre sempre esse ticket travado → Vi muda em todo lugar. **Correção:** (a) deixar
a Vi **continuar respondendo** mesmo na fila; (b) botão **"Sair da fila / Resolvido"**
pro usuário fechar o ticket (novo endpoint que valida que o ticket é dele). — **S-M**

---

## Ordem sugerida
1. **Bugs baratos:** G-01, G-04, G-06, G-07, G-13 (+ G-12).
2. **Mapa:** G-03, G-09, G-10.
3. **Decisões:** G-11 (regra do furo), G-08 (navegação/menu), G-05 (câmera), G-02 (abas).
4. Implementar o que você decidir.
