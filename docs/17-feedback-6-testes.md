# 17 — Roadmap do 6º ciclo de testes (feedback do David)

> Feedback do David (2026-07-17), mais curto e menos crítico que os anteriores:
> refinamentos de navegação da agenda + um link quebrado. Cada item investigado
> no código (causa-raiz real). Nenhum exigiu decisão de produto — todos resolvidos
> autônomos (são bugs/UX óbvios). `arquivo:linha` e esforço (S/M/L).

## Índice

| # | Item | Tipo | Decisão? | Esforço |
|---|---|---|---|---|
| H-01 | "Ver na minha agenda" abre no dia+hora certos do serviço | UX | não | M |
| H-02 | Criar vaga a partir de um dia/horário pré-preenche o formulário | UX | não | M |
| H-03 | "Buscar serviços" a partir de um horário já aplica o filtro dia+hora | UX | não | M |
| H-04 | Notificações → "Falar com a Vi" dava Unmatched Route → remover | bug | não | S |

---

## Itens (resolvidos autônomos)

### H-01 · "Ver na minha agenda" deve abrir no dia e hora do serviço
Antes o botão só trocava para a aba de agenda (dia/hora padrão), obrigando o
usuário a procurar o serviço. **Correção:** o link agora carrega o dia e a hora
do serviço por query params e a agenda abre no dia certo, na visão diária, e
**rola** até a linha da hora do serviço (ex.: 02:00 de terça → terça + scroll
até 02:00). — **M** · ✅ **Feito**
- `gig-detail-screen.tsx`: "Ver na minha agenda" → `router.replace('/?day=YYYY-MM-DD&hour=HH')`.
- `agenda-screen.tsx`: efeito lê `params.day`/`params.hour`, seta o dia, força a
  visão `day` e passa `scrollToHour` para a timeline. Trocar de dia manualmente
  cancela o scroll (senão voltaria a rolar para a hora antiga).
- `day-timeline.tsx`: novo prop `scrollToHour`; como as linhas têm alturas
  diferentes (livre ~52px vs. bloco de compromisso `span×48px`), capturamos o `y`
  real de cada hora via `onLayout` (em vez de estimar) e rolamos um pouco acima.
- **Refinamento (David):** o scroll é só um **posicionamento inicial** — rola uma
  vez e deixa o usuário livre. Um `ref` marca a hora já rolada, senão cada refetch
  da agenda (novo array `commitments`) redispararia o efeito e puxaria a tela de
  volta depois que a pessoa tivesse rolado para outra hora.

### H-02 · Criar vaga a partir de um dia/horário pré-preenche dia+hora
Clicar num dia (semana/mês) ou num horário (diária) e escolher "Anunciar vaga"
deve levar aquele dia+hora para o formulário, em vez do padrão (amanhã, 14h).
**Correção:** a timeline manda `day`/`hour` no `router.push('/post?...')`; a tela
de anúncio monta um `GigDraft` inicial com o `startsAt` no dia/hora marcados
(duração padrão de 1h — igual ao form normal, `startHour → startHour+1`; David
apontou que o padrão é 1h, não 2h) e o `GigForm` semeia os campos. Como só semeia na
montagem, remontamos (bump de `key`) quando chega um novo horário; tocar de novo
na aba "Anunciar" limpa os params e volta ao padrão. — **M** · ✅ **Feito**
(verificado: slot 15h → "seg, 20 jul" + "15:00 até 17:00").
- `agenda-screen.tsx` (`onPostSlot`), `post-screen.tsx` (`slotInitial` + `formKey`).

### H-03 · "Buscar serviços" a partir de um horário já aplica o filtro
Clicar num horário e escolher "Buscar serviços" deve mostrar direto os
resultados já filtrados pelo dia+hora, ainda permitindo refinar por categoria.
Isso evoluiu, no feedback seguinte do David, para o **redesenho completo da
busca** (rodada 24, Opção A → **D-074**): a busca passou a ser
**"resultados primeiro"** — a lista abre no topo e um único botão **"Filtrar"**
(gaveta) reúne **dia, hora, categoria e distância**; os filtros ativos viram
**chips removíveis**. Vindo de um horário da agenda, a busca já abre com o
dia+hora aplicados e a lista filtrada. — **L** · ✅ **Feito** (verificado por
screenshot: lista no topo, "N vagas perto de você", gaveta com as 4 seções e o
slider de distância "Até 50 km de você").
- `agenda-screen.tsx` (`onSearchSlot`), `search-screen.tsx` (reescrita p/ Opção A),
  `components/radius-slider.tsx` (novo), `region.ts` (raio padrão 50 km + auto-locate),
  `components/region-modal.tsx` (`showRadius`). Detalhes e distância em **D-074**.

**Follow-up pedido pelo David:** **busca por texto** (digitar "pintor" sem saber
a categoria) → **rodada 25** (design) para escolha antes de implementar.

### H-04 · Notificações → "Falar com a Vi" dava Unmatched Route
O botão apontava para `/vi`, rota inexistente (tela "Unmatched Route"). Como a
**Central de Ajuda** já leva à Vi, o botão direto era redundante. **Correção:**
removido o atalho "Falar com a Vi"; a Central de Ajuda continua sendo o caminho
para a Vi. De quebra, corrigido o outro `/vi` remanescente (`Contestar débito`
→ `/help/vi?escalate=1`). — **S** · ✅ **Feito**
- `settings-screen.tsx` (linha removida), `service-detail-screen.tsx` (`/vi` → `/help/vi`).
