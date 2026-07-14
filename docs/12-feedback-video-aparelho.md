# Feedback do vídeo no aparelho — 3º ciclo (2026-07-14)

> Fonte: vídeo gravado pelo David no **APK real** (build EAS `preview`, já com
> tudo até o commit da Fatia 3 do B-30). Primeiro teste de verdade no celular.
> Cada item: descrição, causa provável, severidade, status.

## Legenda
- 🔴 A fazer · 🟡 em progresso · 🟢 corrigido · 🔵 precisa de decisão/mock

## O que funcionou (positivo)
- **Login com Google** ✅ (entrou como David — B-01 resolvido de fato).
- Busca nova com chips de data, tiles de categoria e "Ver todas as vagas".
- Perfil com card "Alertas de vagas", carteira e agenda renderizando certo.
- (Não exercitados no vídeo: **upload de foto** e **criar alerta** — seguem
  pendentes de validação no aparelho.)

---

## V-01 🟢 Mapa da vaga aberta trava, apaga e perde o zoom — CORRIGIDO
> **Causa-raiz achada** (confirmada pela narração: "cada pequeno movimento é um
> arrastar o mapa inteiro", ~50 arrastes). Os dois mapas usam o mesmo
> `LocationMap` em modal cheio, mas o `LocationMap` tinha um **efeito de
> recentralização em tempo de render**: a cada re-render da tela ele comparava a
> posição atual com a prop e dava `jumpTo` de volta. Na **criação** existe
> `onCenterChange` (a prop acompanha o arraste), então não recentraliza; na
> **visualização** não há `onCenterChange`, então **cada re-render da tela da
> vaga jogava o mapa de volta pro centro**, desfazendo o arraste.
> **Correção:** recentralizar só quando `lat/lng` **mudam de verdade** (busca),
> dentro de `useEffect` (nunca no corpo do render); o `onMessage` (arraste do
> usuário) não mexe mais na referência. Também: **trava de zoom** (min 11 / max
> 18) no mapa aproximado — impede o "zoom-out pro Brasil inteiro" que deixava a
> tela em branco. `location-map.tsx`.

### (histórico) descrição original
- **Descrição:** no mapa **"Região do serviço"** (dentro de uma vaga já
  anunciada), ao arrastar/pinçar: o mapa fica **totalmente em branco** por
  ~15–20s, o círculo some, e volta **super afastado** (mostrando Brasília,
  BH, SP, Rio — o país inteiro). Fica inutilizável. **Na criação da vaga o
  mapa funciona** (é modal em tela cheia, sem `ScrollView` em volta).
- **Causa provável:** MapLibre dentro de `react-native-webview`, e o WebView
  está dentro do `ScrollView` da tela da vaga. O gesto é mal interpretado
  (pinch vira zoom-out extremo) e os tiles somem enquanto recarrega o novo
  nível. O `nestedScrollEnabled`+`overScrollMode` que apliquei antes **não
  resolveu**.
- **Correção provável (a decidir):** (a) **travar/limitar o zoom** do mapa da
  vaga aberta (só pan, ou min≈max zoom perto do nível certo) — barato e mata o
  pior (o zoom-out maluco); ou (b) trocar por **mapa nativo de verdade**
  (`@maplibre/maplibre-react-native` / `react-native-maps`) — robusto, mas dep
  nativa nova + build. Recomendo começar por (a).
- **Severidade:** Alta (é a tela que o candidato usa pra situar a vaga).

## V-02 🟢 Dois círculos no mapa aproximado — CORRIGIDO
- **Descrição:** o mapa da região desenhava **dois círculos roxos** sobrepostos.
- **Causa:** o `map.on('load')` podia redesenhar o círculo (recarga de estilo).
- **Correção:** guarda `if (map.getSource('area')) return;` → desenha uma vez só.
  (Se ainda aparecer, era efeito colateral do snap-back do V-01, já corrigido.)
- **Severidade:** Baixa.

## V-03 🟢 (corrigido) Vaga própria mostra "Me candidatar" e "Denunciar"
- **Descrição:** abrindo a **sua própria vaga** pela busca, o app mostra
  **"Me candidatar"** e **"🚩 Denunciar esta vaga"**. Você não deveria poder se
  candidatar nem denunciar a própria vaga. No vídeo o David **denunciou a
  própria vaga** (foi aceito) e ela sumiu da busca + passou a dizer "não é
  possível se candidatar".
- **Causa:** a detecção de dono existe (mensagem `own_gig` → "Esta vaga foi
  anunciada por você"), mas é **inconsistente**: em algumas vagas aparece o
  aviso e some o "Me candidatar", em outras não; e o link **Denunciar** nunca é
  escondido (só depende de estar logado, `status === 'signedIn'`). Provável
  corrida: o botão renderiza antes de `useMyCandidacy` resolver `own_gig`.
- **Correção:** gate firme por `gig.posterId === session.user.id`: se for dono,
  esconder "Me candidatar" **e** "Denunciar" e mostrar o caminho de gestão
  (ver candidatos / minha vaga). Não depender só do `own_gig` assíncrono.
- **Correção:** gate síncrono `isOwner = gig.posterId === session.user.id` no gig-detail — dono não vê 'Me candidatar' nem 'Denunciar'; vê 'Gerenciar minha vaga' (→ /service/id).
- **Severidade:** Média/Alta (coerência; e denunciar a própria vaga é furada).

## V-04 🟢 (corrigido) Perfil próprio mostra "Bloquear usuário" (e bloquear a si dá erro)
- **Descrição:** abrindo o **seu próprio perfil** (via "Anunciado por David"),
  aparece **"Bloquear usuário"**; ao tocar, dá erro "Não foi possível
  completar" (o back recusa bloquear a si mesmo).
- **Correção:** `isSelf = params.id === session.user.id` esconde o 'Bloquear usuário' no próprio perfil.
- **Severidade:** Média.

## V-05 🟢 (corrigido) Busca lista as suas próprias vagas
- **Descrição:** "Todas as vagas" e as categorias mostram as vagas que **você
  anunciou** (Baba, Teste2, Teste3). Como não dá pra trabalhar na própria
  vaga, elas não deveriam aparecer na busca (ou deveriam vir marcadas
  "sua vaga", sem botão de candidatar).
- **Correção:** `fetchOpenGigs` ganhou `excludePosterId` (`.neq poster_id`), passado pelo `useOpenGigs` com o id do usuário logado.
- **Severidade:** Média.

## V-06 🟢 Teto de valor não era aplicado no servidor — CORRIGIDO
- **Descrição:** existiam vagas de **R$ 1.000.000** e **R$ 10.000.000**. O teto
  (R$ 10.000, `GIG_MAX_PRICE_CENTS`) valia no app (client) mas **não no
  servidor**: a função `create-gig` deployada tinha uma **cópia antiga** do
  `gig-draft.ts` (de antes do teto), então aceitava qualquer valor.
- **Correção:** redeploy da `create-gig` (**v23**) com os `packages/core`
  atuais → agora recusa com `price_too_high` (verificado e2e). As vagas acima
  do teto foram **expiradas** (saem da busca).
- **Severidade:** Alta (era brecha de valor absurdo) — resolvido.

## V-07 🟢 Alerta só aceita 1 categoria; não dá pra "todas" — CORRIGIDO
- **Descrição (David):** ao criar alerta, só dá pra escolher **uma** categoria;
  não há como escolher **várias** nem **todas as categorias**.
- **Correção:** migração 0044 trocou `category_id` por `category_ids uuid[]`
  (**vazio = todas**); UI com multi-seleção + chip "Todas as categorias";
  trigger de matching atualizado. Verificado e2e (alerta 'todas' casa com vaga
  de qualquer categoria; alerta existente preservado).
- **Severidade:** Média (feature pedida).

## V-08 🟡 Push não chega (falta FCM no Android)
- **Descrição:** ao criar uma vaga que casa com o alerta do David, a
  **notificação in-app (sino) é criada** (verificado), mas **nenhum push token**
  do aparelho dele está registrado → o push do sistema não sai.
- **Causa provável:** push no **Android** via Expo exige **FCM (Firebase)**
  configurado nas credenciais do EAS. Sem isso, `getExpoPushTokenAsync` falha e
  o token não é salvo. (Ou a permissão de notificação não foi concedida.)
- **A fazer (config do David):** (1) confirmar que permitiu notificações; (2)
  configurar **FCM** no projeto EAS (`eas credentials` → Android → FCM V1, com
  um projeto Firebase). Detalhar em docs/10.
- **Severidade:** Média (o sino já funciona; só o push do SO depende disso).

---

## Observações
- **V-03/V-04/V-05 têm a mesma raiz:** o app não trata de forma consistente o
  caso "o usuário é o dono da vaga/perfil". Aparecem muito porque o David testa
  sozinho (é anunciante e visitante ao mesmo tempo), mas são bugs reais de
  coerência.
- **Ordem sugerida:** V-06 ✅ → V-03/V-04/V-05 (coerência do "dono", rápido e de
  alto impacto) → V-02 (círculo) → **V-01 (mapa)**, que é o mais pesado e
  precisa da sua escolha entre "travar zoom" (rápido) e "mapa nativo" (robusto).
