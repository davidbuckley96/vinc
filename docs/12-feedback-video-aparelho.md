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

### V-01c 🟢 RAIZ CONFIRMADA + fix definitivo — o círculo no WebGL
- **Pista decisiva do David:** na MESMA vaga, o mapa é **fluido para o
  anunciante** (vê o local **exato**, sem círculo) e **trava para o trabalhador**
  (vê a **região aproximada** = o **círculo** de anonimato, D-028). Trocar de
  conta troca o comportamento. → a raiz é o **círculo desenhado dentro do mapa
  WebGL** (polígono do MapLibre re-tesselando/preenchendo a cada frame no
  WebView), não o snap-back nem o gesto em si.
- **Fix tentado (D-065, NÃO resolveu):** mover o círculo do WebGL para uma
  **camada RN** translúcida por cima. No build de teste o David reportou que
  **continuou travando** (inclusive para o anunciante ao visitar a vaga aberta)
  e que a camada RN ficava **presa no centro da tela** ao arrastar (não seguia o
  mapa). Ou seja: até uma `View` translúcida grande por cima do WebView engasga
  o gesto no Android. Só o mapa **sem qualquer camada/overlay** (o lado exato,
  com pino leve) era fluido.

### V-01d 🟢 Fix DEFINITIVO — acabar com o círculo: mapa centrado no bairro (D-066)
- **Proposta do David:** em vez de círculo, abrir o mapa **centrado no bairro**
  de quem anunciou. Sem círculo algum (que é o que trava), e o anonimato se
  mantém por mostrar só o bairro + aviso de que o endereço exato é liberado se a
  pessoa for escolhida.
- **Implementação:** o ponto público guardado passa a ser o **centroide do
  bairro** (resolvido no `create-gig` via Nominatim server-side, enviesado por
  viewbox ao redor do ponto exato; fallback para o embaralhamento antigo se o
  geocoder falhar). O `LocationModal` no modo aproximado **não desenha círculo
  nem pino** — abre centrado no ponto (= bairro) em zoom 14. Mapa sem camadas =
  arrasta liso. Detalhe em **D-066**.
- **Verificado e2e:** vaga de teste em **Bancários, João Pessoa** → ponto
  público = **centroide exato do bairro** no Nominatim, a **1258 m** da rua
  real (endereço exato escondido). Confirmar a fluidez no próximo build.

### V-01b 🟡 (histórico) Gesto AINDA travado no build com o fix do snap-back
- O build `db9ca367` **já continha** o fix do snap-back (confirmado por
  `git merge-base`), e mesmo assim o gesto continua travado → o snap-back **não
  era a raiz** (ou não a única). Também: no mapa da vaga **não dá pra digitar
  endereço** (isso é a busca, ver V-09) e o **drag/zoom-out não é fluido**.
- **Experimento (a pedido do David):** igualar os dois mapas. `LocationModal`
  passou a renderizar como o mapa da criação — **sem o círculo de região
  aproximada e sem marcador** desenhados no WebView (comentados), só o mapa
  interativo + pino central (RN). Se ficar fluido, o culpado era o desenho do
  círculo → re-adicionamos de outro jeito (ex.: overlay RN, não dentro do WebGL).
- **Também aplicado:** `androidLayerType="hardware"` no WebView — fix conhecido
  de fluidez de mapa WebGL dentro de WebView no Android (não tinha sido tentado).
- **Só valida no build nativo** (o web usa MapLibre direto, não reproduz).

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

## V-09 🟢 Busca de endereço "não encontra nada" no aparelho — CORRIGIDO
- **Descrição:** no aparelho, digitar endereço/bairro nunca traz sugestão
  ("sempre diz que não encontrou"). Do servidor o Nominatim funciona.
- **Causa:** o app batia no **Nominatim direto do celular**. No 4G, o **IP
  compartilhado da operadora** é bloqueado/limitado pela política do Nominatim
  (que proíbe uso de app), e o **`User-Agent` é ignorado no Android** (vai como
  `okhttp`), o que o Nominatim rejeita → resposta vazia.
- **Correção:** Edge Function **`geocode`** faz proxy do Nominatim
  **server-side** (IP estável + User-Agent correto). `geocoding.ts` chama a
  função em vez de `fetch` direto. **Verificado e2e** (search, region com viés
  por GPS, reverse — todos retornam resultados).
- **Provedor de produção (proposta, quando escalar):** o Nominatim público não
  aguarda volume nem autocomplete real. Migrar o *dentro da função* (sem tocar
  no app) para:
  - **LocationIQ** — grátis até 5k/dia, base OSM, autocomplete liberado, com
    chave. Mais parecido com o Nominatim (migração fácil).
  - **Mapbox Geocoding** — grátis generoso, ótimo autocomplete, com chave.
  - **Photon (komoot)** — grátis, sem chave, mas cobertura fraca de rua no
    Brasil (testado: retornou 0). Serve mais p/ cidades/bairros.
  - **Google Places Autocomplete** — melhor qualidade, porém pago.
  Recomendo **LocationIQ** quando precisar de volume/autocomplete; até lá o
  proxy do Nominatim resolve.

---

## Observações
- **V-03/V-04/V-05 têm a mesma raiz:** o app não trata de forma consistente o
  caso "o usuário é o dono da vaga/perfil". Aparecem muito porque o David testa
  sozinho (é anunciante e visitante ao mesmo tempo), mas são bugs reais de
  coerência.
- **Ordem sugerida:** V-06 ✅ → V-03/V-04/V-05 (coerência do "dono", rápido e de
  alto impacto) → V-02 (círculo) → **V-01 (mapa)**, que é o mais pesado e
  precisa da sua escolha entre "travar zoom" (rápido) e "mapa nativo" (robusto).
