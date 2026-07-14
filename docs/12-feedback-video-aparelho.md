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

## V-01 🔴 Mapa da vaga aberta trava, apaga e perde o zoom (crítico)
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

## V-02 🔴 Dois círculos no mapa aproximado
- **Descrição:** o mapa da região aproximada desenha **dois círculos roxos**
  sobrepostos, em vez de um só (~600 m).
- **Causa provável:** o polígono do círculo é adicionado mais de uma vez (re-
  render/`map.on('load')` disparando duas vezes, ou marker + área).
- **Severidade:** Baixa (visual), mas passa impressão de bug.

## V-03 🔴 Vaga própria mostra "Me candidatar" e "Denunciar"
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
- **Severidade:** Média/Alta (coerência; e denunciar a própria vaga é furada).

## V-04 🔴 Perfil próprio mostra "Bloquear usuário" (e bloquear a si dá erro)
- **Descrição:** abrindo o **seu próprio perfil** (via "Anunciado por David"),
  aparece **"Bloquear usuário"**; ao tocar, dá erro "Não foi possível
  completar" (o back recusa bloquear a si mesmo).
- **Correção:** na tela de perfil público, esconder o "Bloquear usuário"
  quando `params.id === session.user.id` (e idealmente esconder o link
  "Anunciado por …" quando o anunciante é você).
- **Severidade:** Média.

## V-05 🔴 Busca lista as suas próprias vagas
- **Descrição:** "Todas as vagas" e as categorias mostram as vagas que **você
  anunciou** (Baba, Teste2, Teste3). Como não dá pra trabalhar na própria
  vaga, elas não deveriam aparecer na busca (ou deveriam vir marcadas
  "sua vaga", sem botão de candidatar).
- **Correção:** filtrar `poster_id <> auth.uid()` na busca de vagas abertas
  (`fetchOpenGigs`), como já se faz com bloqueados/denunciados.
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

---

## Observações
- **V-03/V-04/V-05 têm a mesma raiz:** o app não trata de forma consistente o
  caso "o usuário é o dono da vaga/perfil". Aparecem muito porque o David testa
  sozinho (é anunciante e visitante ao mesmo tempo), mas são bugs reais de
  coerência.
- **Ordem sugerida:** V-06 ✅ → V-03/V-04/V-05 (coerência do "dono", rápido e de
  alto impacto) → V-02 (círculo) → **V-01 (mapa)**, que é o mais pesado e
  precisa da sua escolha entre "travar zoom" (rápido) e "mapa nativo" (robusto).
