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

## Como comprovo (ambiente de reprodução)
O app roda no meu sandbox como **Expo Web** dentro de um navegador headless
(Playwright + Chromium), de onde tiro as imagens antes/depois e gravo o vídeo.
Itens **exclusivos do Android nativo** — marcados com 📱 — não se reproduzem no
web e a prova em vídeo depende do aparelho do David; nesses eu corrijo pela
causa-raiz no código e explico. Imagens ficam em `docs/design/testes-2026-07/`.

---

## Área 1 — Autenticação

### B-01 📱 Login/cadastro com Google → "localhost recusado" 🔴
- **Descrição:** ao entrar/cadastrar com Google, cai numa página "não é
  possível acessar esse site — a conexão com localhost foi recusada". Pelo
  e-mail/senha no próprio app funciona.
- **Causa provável:** a URL de redirect do OAuth aponta para `localhost` (fluxo
  de dev), em vez de usar o deep link do app (`vinc://` / proxy do Expo). É
  configuração de OAuth + `redirectTo` no `signInWithOAuth`, não lógica de UI.
- **Severidade:** Alta (bloqueia um caminho de login).

---

## Área 2 — Busca e navegação

### B-02 Título da aba Buscar impróprio 🔴
- **Descrição:** ao escolher "Quero fazer bicos" vai para a busca, cujo título
  é "O que você quer fazer?". Deveria ser algo como **"Procurar trabalhos"**.
- **Severidade:** Baixa (texto).

### B-03 Falta "todas as categorias" na busca 🔴
- **Descrição:** a busca por categorias não tem uma opção para ver **todas** as
  categorias de uma vez.
- **Severidade:** Média.

### B-04 📱 Botão "voltar" do celular numa categoria vai pra home 🔴
- **Descrição:** dentro de uma categoria, o botão voltar do Android leva à
  página inicial, em vez de voltar para a lista de categorias (como faz a seta
  do cabeçalho). O drill-down de categoria é estado interno, não uma rota, então
  o back de hardware sai da aba.
- **Severidade:** Média.

### B-05 🔵 Filtros de data na busca (hoje/amanhã/calendário em faixa) 🔴
- **Descrição:** a aba de busca deveria ter filtros como na criação de vaga:
  "hoje", "amanhã" e um **calendário de faixa** (dia de início + dia de fim;
  clicar 2× no mesmo dia = só aquele dia). Ver imagem de referência enviada.
- **Nota:** precisa de mock de UI (faixa de datas) para aprovação.
- **Severidade:** Média.

### B-06 Filtro de hora na busca só vai de 6h–23h 🔴
- **Descrição:** o filtro de hora deveria cobrir **24h** (ex.: "qualquer dia,
  às 03h"), como já ficou na criação de vaga (D-053).
- **Severidade:** Média.

### B-07 ⚪ Filtro de localização por raio (x/y/z km) na busca 🔴
- **Descrição:** poder ver vagas dentro de um raio (ex.: 5/10/30 km); sem filtro,
  ver vagas mais distantes. (Já existe `useRegion`/raio no back — expor na UI.)
- **Severidade:** Média.

### B-08 ⚪ Buscar vagas por região específica (ex.: "SP", "Ceilândia") 🔴
- **Descrição:** poder pesquisar vagas numa região por nome, não só pelo raio
  em torno da posição atual.
- **Severidade:** Média.

---

## Área 3 — Mapa e localização

### B-09 📱 Mapa da vaga aberta captura só ~1% do gesto 🔴
- **Descrição:** no mapa de uma vaga já aberta, arrastar/pinçar move só uma
  fração e trava; precisa repetir o gesto várias vezes. Ao anunciar/escolher a
  própria vaga não acontece.
- **Causa provável:** o `LocationModal` navegável (D-055) usa `react-native-webview`
  no Android; os gestos do mapa dentro do WebView disputam com o gesto do
  container. É nativo — no web (MapLibre direto) não ocorre.
- **Severidade:** Alta (mapa inutilizável na vaga aberta).

### B-10 Busca de endereço não sugere e não move o pino; início no meio do Brasil 🔴
- **Descrição:** digitar "rua 36 norte" não mostra sugestões; confirmar um
  endereço não move o pino (como o Google Maps faria); o mapa abre sempre no
  centro do Brasil, em vez da região do usuário.
- **Severidade:** Alta (fluxo central de criação de vaga).

### B-11 Aceita local inválido (oceano / fora do Brasil) 🔴
- **Descrição:** ainda dá para confirmar um ponto no oceano/fora do Brasil.
- **Prova exigida:** vídeo mostrando que a busca funciona **e** que local
  inválido/fora do Brasil é recusado.
- **Severidade:** Alta.

### B-12 Botão do local deve mostrar o endereço + "abrir"→"mudar" 🔴
- **Descrição:** depois de escolher, o botão deveria mostrar o endereço em vez
  de "Escolher local no mapa"; o texto "abrir" deveria virar "mudar".
- **Severidade:** Baixa.

### B-13 Endereço (bairro + cidade) no card de prévia da vaga 🔴
- **Descrição:** o card de prévia deveria mostrar ao menos bairro e cidade.
- **Severidade:** Baixa.

---

## Área 4 — Criação de vaga

### B-14 Publicar vaga → redirecionar para a vaga aberta 🔴
- **Descrição:** ao publicar, deveria ir para a página da vaga recém-criada.
- **Severidade:** Média.

### B-15 Formulário mantém estado ao trocar de aba 🔴
- **Descrição:** anunciar → ir para Carteira → voltar em Anunciar: volta na
  mesma tela, com a mensagem "vaga publicada…" e o mesmo local. Deveria começar
  em branco.
- **Severidade:** Média.

### B-16 Serviços que viram o dia + limite de 8h 🔴
- **Descrição:** serviço 22h–03h só é possível abrindo duas vagas. Deveria dar
  para escolher o **dia de término**. **Regra:** duração máxima de **8h**
  (jornada — motivo trabalhista).
- **Severidade:** Média.

### B-17 Taxa "+ R$ x" desalinha a UI 🔴
- **Descrição:** o "+ " antes do valor da taxa quebra o alinhamento dos
  centavos; deixar só "R$ x", mantendo o alinhamento entre vagas de valores
  diferentes.
- **Severidade:** Baixa (visual).

### B-18 Falta valor máximo por vaga 🔴
- **Descrição:** vagas não deveriam ter valores absurdos (ex.: 8h por 50.000).
  Definir um teto sensato (a validar com o David).
- **Severidade:** Média.

### B-19 Erro genérico em valores muito altos (≥ 10 mi) 🔴
- **Descrição:** valores a partir de ~10 milhões dão "Não foi possível publicar.
  Verifique os dados…", sem dizer o motivo. Precisa de mensagem específica.
- **Severidade:** Baixa (relacionado a B-18).

### B-20 Calendário quebra com meses de 6 semanas 🔴
- **Descrição:** meses com 5 semanas (dez/2026) e 6 semanas (jan/2027) mudam a
  altura do calendário, movendo os botões de avançar/recuar de posição —
  causando cliques errados ou fechar o calendário sem querer.
- **Severidade:** Média (usabilidade).

### B-21 "3 vagas abertas" deve ser link + voltar preserva o rascunho 🔴
- **Descrição:** ao atingir o limite e mandar cancelar uma para publicar outra,
  o "3 vagas abertas" deveria ser um **link** para o perfil com todas as vagas
  (para apagar). E voltar deveria retornar à vaga em criação sem refazer tudo.
- **Severidade:** Média.

---

## Área 5 — Denúncia e moderação

### B-22 "Outro motivo" exige texto 🔴
- **Descrição:** denunciar por "outro motivo" só deveria ser permitido se o
  motivo for especificado no texto.
- **Severidade:** Baixa.

### B-23 Vaga denunciada continua na lista + candidatar + re-denunciar 🔴
- **Descrição:** após denunciar, a vaga ainda aparece nas vagas abertas, ainda
  dá para se candidatar, e dá para denunciar de novo várias vezes.
- **Severidade:** Média.

### B-24 Candidatar e depois denunciar não remove a candidatura 🔴
- **Descrição:** dá para candidatar e denunciar; a denúncia não tira a
  candidatura. **Cuidado:** denunciar **não pode** virar uma saída fácil para o
  prestador escapar do serviço — não pode servir de desistência sem multa.
- **Severidade:** Média (regra de negócio delicada).

### B-25 Editar vaga: bloquear com candidatos/escolhido; liberar sem candidaturas 🔴
- **Descrição:** com candidatos ou trabalhador escolhido, **não** pode editar
  (horário/local etc.). Sem candidaturas (aberta e ninguém aplicou, ou todos
  recusados), **deveria** dar para editar.
- **Severidade:** Média.

---

## Área 6 — Agenda

### B-26 🔵 Candidaturas no mesmo horário: mostrar todas 🔴
- **Descrição:** candidatando-se a várias vagas no mesmo horário, a agenda mostra
  só uma. Deveria mostrar todas — com um "+3" clicável quando não couberem.
  Cuidado: card de 5h é maior que de 2h; um card de 2h deve caber "dentro" do de
  5h. **Precisa de mock de UI para aprovação.**
- **Severidade:** Média.

### B-27 ⚪ Agenda: navegar meses à frente e ver meses anteriores 🔴
- **Descrição:** poder ver meses futuros (anunciar/candidatar com antecedência)
  e meses passados (só visualizar dias com serviços feitos, sem candidatar).
- **Severidade:** Média.

---

## Área 7 — Perfil

### B-28 Perfil: gerenciar candidaturas e vagas abertas 🔴
- **Descrição:** o perfil deveria listar candidaturas e vagas abertas do usuário,
  para gerenciar/excluir.
- **Severidade:** Média.

### B-29 Cliente sem avaliações: nota 5 + selo "novo usuário" 🔴
- **Descrição:** quem ainda não tem avaliações deveria aparecer com nota **5**,
  mas com um selo "novo usuário" visível para quem está escolhendo.
- **Severidade:** Baixa.

### B-30 ⚪ Perfil: foto, localização e alertas de vagas (estilo LinkedIn) 🔴
- **Descrição:** adicionar foto, definir localização e criar alertas de vagas
  para serviços/horários/dias específicos.
- **Severidade:** Média (feature).

---

## Ordem sugerida de ataque
1. **Correções rápidas e de alto impacto no fluxo de vaga:** B-17 (taxa), B-12,
   B-13, B-14, B-15, B-02, B-19+B-18 (valor), B-20 (calendário).
2. **Localização (crítico):** B-10, B-11 (com vídeo), B-16 (vira o dia + 8h).
3. **Denúncia/moderação coerente:** B-22, B-23, B-24, B-25.
4. **Busca com filtros:** B-06, B-07, B-08, B-05 (mock), B-03.
5. **Agenda e perfil:** B-26 (mock), B-27, B-28, B-29.
6. **Nativos (prova no aparelho do David):** B-01, B-04, B-09.
7. **Features maiores:** B-30.
