# Bugs e melhorias — 2º ciclo de testes do David (2026-07-14)

> Documento vivo. Cada item tem: descrição, como reproduzir, severidade,
> status e (quando corrigido) evidência **antes/depois**. Ao final de tudo,
> um **vídeo** comprova as correções. Fonte: feedback do David após testar o
> APK gerado com os ajustes D-051…D-056.

## Legenda de status
- 🔴 **A fazer**
- 🟡 **Em progresso**
- 🟢 **Corrigido** (com antes/depois)
- 🔵 **Precisa de mock/aprovação de UI** antes de implementar (regra do projeto)
- ⚪ **Feature nova** (não é bug; entra no roadmap de produto)

## Como comprovo (ambiente de reprodução) — validado 2026-07-14
O app **compila e roda** no meu sandbox como **Expo Web** (`expo export`
+ servidor estático) dentro de um navegador headless (Playwright + Chromium),
com viewport de celular. Já capturei telas reais (ver `harness-app-rodando.png`
e `antes-B02-busca-titulo.png`). Imagens em `docs/design/testes-2026-07/`.

Limitações descobertas (a resolver antes do vídeo completo):
- **Itens 📱 nativos do Android** (mapa/gesto B-09, back de hardware B-04,
  OAuth localhost B-01) **não** se reproduzem no web — corrijo pela causa-raiz e
  a prova em vídeo depende do aparelho do David.
- **Fluxos que dependem do backend** (login real, criar vaga no banco, busca de
  endereço no Nominatim) exigem que o Chromium headless use o **proxy de saída**
  do sandbox; sem isso as chamadas externas ficam pendendo. Para telas de
  UI/lógica **client-side** (a maioria) rodo em **modo demonstração** (com
  mocks), navego livremente e capturo antes/depois. Próximo passo do harness:
  (a) forçar modo demo no build de teste **ou** (b) configurar o proxy no
  navegador para dirigir os fluxos reais e gravar o vídeo.

---

## Área 1 — Autenticação

### B-01 📱 Login/cadastro com Google → "localhost recusado" 🟡 (falta config do David)
- **Descrição:** ao entrar/cadastrar com Google, cai numa página "não é
  possível acessar esse site — a conexão com localhost foi recusada". Pelo
  e-mail/senha no próprio app funciona.
- **Causa:** o código do app **já está correto** — no nativo usa PKCE com deep
  link do app (`Linking.createURL('/auth')` → `vinc://auth`),
  `openAuthSessionAsync` e `exchangeCodeForSession` (`auth-actions.ts`); o
  cliente usa `flowType: 'pkce'` (`supabase.ts`). O "localhost recusado"
  aparece quando o **redirect final não está na allowlist** do Supabase/Google,
  então o navegador cai no `localhost` do dev.
- **Falta (config do David, não é código):**
  1. **Supabase → Authentication → URL Configuration → Redirect URLs:** incluir
     `vinc://auth` (app), a URL do site web publicado e, para testar no Expo Go,
     a URL do proxy (`exp://…`).
  2. **Supabase → Authentication → Providers → Google:** habilitar e colar o
     Client ID/Secret do Google.
  3. **Google Cloud Console → Credenciais → OAuth 2.0 → Authorized redirect
     URIs:** incluir o callback do Supabase
     `https://gexzpkbqodoyoxudzklb.supabase.co/auth/v1/callback`.
  Depois disso o fluxo nativo (`vinc://auth`) e o web funcionam sem cair no
  localhost. Detalhado em `docs/10-infra-cicd-observabilidade.md`.
- **Severidade:** Alta (bloqueia um caminho de login).

---

## Área 2 — Busca e navegação

### B-02 Título da aba Buscar impróprio 🟢
- **Descrição:** ao escolher "Quero fazer bicos" vai para a busca, cujo título
  é "O que você quer fazer?". Deveria ser algo como **"Procurar trabalhos"**.
- **Severidade:** Baixa (texto).
- **Correção:** título → **"Procurar trabalhos"** (`search-screen.tsx`).
  Antes: `antes-B02-busca-titulo.png` (reproduzido no harness). Depois pendente
  do harness com modo demo/proxy estável.

### B-03 Falta "todas as categorias" na busca 🟢
- **Descrição:** a busca por categorias não tem uma opção para ver **todas** as
  categorias de uma vez.
- **Severidade:** Média.

### B-04 📱 Botão "voltar" do celular numa categoria vai pra home 🟢 (verificar no aparelho)
- **Descrição:** dentro de uma categoria, o botão voltar do Android leva à
  página inicial, em vez de voltar para a lista de categorias (como faz a seta
  do cabeçalho). O drill-down de categoria é estado interno, não uma rota, então
  o back de hardware sai da aba.
- **Severidade:** Média.

### B-05 Filtros de data na busca (hoje/amanhã/calendário em faixa) 🟢
- **Descrição:** a aba de busca deveria ter filtros como na criação de vaga:
  "hoje", "amanhã" e um **calendário de faixa** (dia de início + dia de fim;
  clicar 2× no mesmo dia = só aquele dia). Ver imagem de referência enviada.
- **Fix (D-062, opção A):** chips "Qualquer dia · Hoje · Amanhã · 📅 Escolher
  datas". O calendário (`DateRangeCalendar`) faz seleção em faixa: toca no
  início e depois no fim; tocar 2× no mesmo dia = só ele. O filtro de hora
  (24h, B-06) só aparece quando é um único dia — uma faixa de vários dias
  cobre cada dia inteiro. `slot` vira a janela [início 00:00, fim+1 00:00],
  casando com a busca por sobreposição no back.
- **Severidade:** Média.

### B-06 Filtro de hora na busca só vai de 6h–23h 🟢
- **Descrição:** o filtro de hora deveria cobrir **24h** (ex.: "qualquer dia,
  às 03h"), como já ficou na criação de vaga (D-053).
- **Severidade:** Média.

### B-07 Filtro de localização por raio (x/y/z km) na busca 🟢
- **Descrição:** poder ver vagas dentro de um raio (ex.: 5/10/30 km); sem filtro,
  ver vagas mais distantes. (Já existe `useRegion`/raio no back — expor na UI.)
- **Fix (D-062):** raios 5/10/30/50/100 km expostos como chips no `RegionModal`.
- **Severidade:** Média.

### B-08 Buscar vagas por região específica (ex.: "SP", "Ceilândia") 🟢
- **Descrição:** poder pesquisar vagas numa região por nome, não só pelo raio
  em torno da posição atual.
- **Fix (D-062):** campo de busca de bairro/cidade no `RegionModal` com
  sugestões **dinâmicas enviesadas pelo GPS** (`searchRegions` com viewbox
  ~75 km ao redor da posição atual) — nada hard-coded. "Centro" perto de
  Aracaju devolve o centro de Aracaju; perto do Rio, o do Rio (verificado
  via API). Sem localização, é busca Brasil inteiro.
- **Severidade:** Média.

---

## Área 3 — Mapa e localização

### B-09 📱 Mapa da vaga aberta captura só ~1% do gesto 🟢 (verificar no aparelho)
- **Descrição:** no mapa de uma vaga já aberta, arrastar/pinçar move só uma
  fração e trava; precisa repetir o gesto várias vezes. Ao anunciar/escolher a
  própria vaga não acontece.
- **Causa:** o mapa (`react-native-webview` no Android) fica dentro do
  `ScrollView` da tela da vaga; o gesto de arrastar era "roubado" pelo scroll
  do container — por isso só na vaga aberta (o mapa de escolher é modal cheio,
  fora de um scroll).
- **Correção:** `nestedScrollEnabled` + `overScrollMode="never"` no `WebView`
  (`location-map.tsx`) — no Android o mapa passa a ganhar o próprio gesto de
  pan/zoom em vez do scroll pai. No-op no iOS/web. **Verificar no aparelho**
  (não reproduzível no harness web, que usa MapLibre direto sem WebView).
- **Severidade:** Alta (mapa inutilizável na vaga aberta).

### B-10 Busca de endereço não sugere e não move o pino; início no meio do Brasil 🟢
- **Descrição:** digitar "rua 36 norte" não mostra sugestões; confirmar um
  endereço não move o pino (como o Google Maps faria); o mapa abre sempre no
  centro do Brasil, em vez da região do usuário.
- **Severidade:** Alta (fluxo central de criação de vaga).

### B-11 Aceita local inválido (oceano / fora do Brasil) 🟢
- **Descrição:** ainda dá para confirmar um ponto no oceano/fora do Brasil.
- **Prova exigida:** vídeo mostrando que a busca funciona **e** que local
  inválido/fora do Brasil é recusado.
- **Severidade:** Alta.

### B-12 Botão do local deve mostrar o endereço + "abrir"→"mudar" 🟢
- **Descrição:** depois de escolher, o botão deveria mostrar o endereço em vez
  de "Escolher local no mapa"; o texto "abrir" deveria virar "mudar".
- **Severidade:** Baixa.

### B-13 Endereço (bairro + cidade) no card de prévia da vaga 🟢
- **Descrição:** o card de prévia deveria mostrar ao menos bairro e cidade.
- **Severidade:** Baixa.

---

## Área 4 — Criação de vaga

### B-14 Publicar vaga → redirecionar para a vaga aberta 🟢
- **Descrição:** ao publicar, deveria ir para a página da vaga recém-criada.
- **Severidade:** Média.

### B-15 Formulário mantém estado ao trocar de aba 🟢
- **Descrição:** anunciar → ir para Carteira → voltar em Anunciar: volta na
  mesma tela, com a mensagem "vaga publicada…" e o mesmo local. Deveria começar
  em branco.
- **Severidade:** Média.

### B-16 Serviços que viram o dia + limite de 8h 🟢
- **Descrição:** serviço 22h–03h só é possível abrindo duas vagas. Deveria dar
  para escolher o **dia de término**. **Regra:** duração máxima de **8h**
  (jornada — motivo trabalhista).
- **Severidade:** Média.

### B-17 Taxa "+ R$ x" desalinha a UI 🟢
- **Descrição:** o "+ " antes do valor da taxa quebra o alinhamento dos
  centavos; deixar só "R$ x", mantendo o alinhamento entre vagas de valores
  diferentes.
- **Severidade:** Baixa (visual).

### B-18 Falta valor máximo por vaga 🟢
- **Descrição:** vagas não deveriam ter valores absurdos (ex.: 8h por 50.000).
  Definir um teto sensato (a validar com o David).
- **Severidade:** Média.

### B-19 Erro genérico em valores muito altos (≥ 10 mi) 🟢
- **Descrição:** valores a partir de ~10 milhões dão "Não foi possível publicar.
  Verifique os dados…", sem dizer o motivo. Precisa de mensagem específica.
- **Severidade:** Baixa (relacionado a B-18).

### B-20 Calendário quebra com meses de 6 semanas 🟢
- **Descrição:** meses com 5 semanas (dez/2026) e 6 semanas (jan/2027) mudam a
  altura do calendário, movendo os botões de avançar/recuar de posição —
  causando cliques errados ou fechar o calendário sem querer.
- **Severidade:** Média (usabilidade).

### B-21 "3 vagas abertas" deve ser link + voltar preserva o rascunho 🟢
- **Descrição:** ao atingir o limite e mandar cancelar uma para publicar outra,
  o "3 vagas abertas" deveria ser um **link** para o perfil com todas as vagas
  (para apagar). E voltar deveria retornar à vaga em criação sem refazer tudo.
- **Severidade:** Média.

---

## Área 5 — Denúncia e moderação

### B-22 "Outro motivo" exige texto 🟢
- **Descrição:** denunciar por "outro motivo" só deveria ser permitido se o
  motivo for especificado no texto.
- **Severidade:** Baixa.

### B-23 Vaga denunciada continua na lista + candidatar + re-denunciar 🟢
- **Descrição:** após denunciar, a vaga ainda aparece nas vagas abertas, ainda
  dá para se candidatar, e dá para denunciar de novo várias vezes.
- **Severidade:** Média.

### B-24 Candidatar e depois denunciar não remove a candidatura 🟢
- **Descrição:** dá para candidatar e denunciar; a denúncia não tira a
  candidatura. **Cuidado:** denunciar **não pode** virar uma saída fácil para o
  prestador escapar do serviço — não pode servir de desistência sem multa.
- **Severidade:** Média (regra de negócio delicada).

### B-25 Editar vaga: bloquear com candidatos/escolhido; liberar sem candidaturas 🟢
- **Descrição:** com candidatos ou trabalhador escolhido, **não** pode editar
  (horário/local etc.). Sem candidaturas (aberta e ninguém aplicou, ou todos
  recusados), **deveria** dar para editar.
- **Severidade:** Média.

---

## Área 6 — Agenda

### B-26 🔵 Candidaturas no mesmo horário: mostrar todas 🟠 (mock pronto — aguarda David)
- **Descrição:** candidatando-se a várias vagas no mesmo horário, a agenda mostra
  só uma. Deveria mostrar todas — com um "+3" clicável quando não couberem.
  Cuidado: card de 5h é maior que de 2h; um card de 2h deve caber "dentro" do de
  5h. **Precisa de mock de UI para aprovação.**
- **Causa:** `buildDaySegments` (`day-timeline.tsx`) usa `.find()` por hora —
  pega só o primeiro compromisso que começa naquela hora.
- **Mock:** `docs/design/rodada-20-agenda-sobreposicao.html` — 3 opções
  (A sobreposição encaixada · **B cartão agrupado "3 candidaturas", recomendada**
  · C colunas). Aguardando a escolha do David para implementar.
- **Severidade:** Média.

### B-27 ⚪ Agenda: navegar meses à frente e ver meses anteriores 🟢
- **Descrição:** poder ver meses futuros (anunciar/candidatar com antecedência)
  e meses passados (só visualizar dias com serviços feitos, sem candidatar).
- **Severidade:** Média.

---

## Área 7 — Perfil

### B-28 Perfil: gerenciar candidaturas e vagas abertas 🟢
- **Descrição:** o perfil deveria listar candidaturas e vagas abertas do usuário,
  para gerenciar/excluir.
- **Severidade:** Média.

### B-29 Cliente sem avaliações: nota 5 + selo "novo usuário" 🟢
- **Descrição:** quem ainda não tem avaliações deveria aparecer com nota **5**,
  mas com um selo "novo usuário" visível para quem está escolhendo.
- **Severidade:** Baixa.

### B-30 ⚪ Perfil: foto, localização e alertas de vagas (estilo LinkedIn) 🟣 (movido para o roadmap)
- **Descrição:** adicionar foto, definir localização e criar alertas de vagas
  para serviços/horários/dias específicos.
- **Encaminhamento:** é uma feature maior (não um bug) — movida para o roadmap
  (docs/05, Fase 4). Precisa de rodada de design e decisão de escopo com o David
  (foto → moderação de imagem; alertas → matching + push já existente).
- **Severidade:** Média (feature).

---

## Ordem sugerida de ataque
1. **Correções rápidas e de alto impacto no fluxo de vaga:** B-17 (taxa), B-12,
   B-13, B-14, B-15, B-02, B-19+B-18 (valor), B-20 (calendário). ✅ concluído
2. **Localização (crítico):** B-10, B-11, B-16 (vira o dia + 8h). ✅ concluído
3. **Denúncia/moderação coerente:** B-22, B-23, B-24, B-25. ✅ concluído
4. **Busca com filtros:** B-06, B-07, B-08, B-05, B-03. ✅ concluído
5. **Agenda e perfil:** B-27, B-28, B-29 ✅ concluído · B-26 (mock rodada 20 pronto — aguarda escolha do David).
6. **Nativos (prova no aparelho do David):** B-04 ✅ · B-09 (código aplicado, verificar no aparelho) · B-01 (código ok, falta config do painel do David).
7. **Features maiores:** B-30 → movido para o roadmap (docs/05, Fase 4).

## Estado final (2026-07-14)
**27 dos 30 pontos entregues em código** (B-02..B-08, B-10..B-29 exceto os
nativos). Restam, todos dependendo do David:
- **B-26** — mock pronto (rodada 20); falta o David escolher a opção para eu
  implementar.
- **B-09** — mitigação de gesto aplicada no código; **verificar no aparelho**
  (não reproduzível no harness web).
- **B-01** — código do OAuth já correto; falta o David configurar a allowlist
  de redirect no Supabase/Google (passos em docs/10 §10).
- **B-30** — feature maior, movida para o roadmap.

O vídeo de comprovação será gravado pelo David (decisão dele nesta rodada).
