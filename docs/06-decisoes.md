# 06 — Registro de Decisões (ADR)

> Toda decisão de produto/arquitetura tomada com o David entra aqui, com data e
> justificativa. Decisões são imutáveis: para reverter, adiciona-se uma nova
> decisão que substitui a anterior.

## D-001 — Stack do app: React Native + Expo (TypeScript)
**Data:** 2026-07-02 · **Decidido por:** David

Um único código gera app iOS, Android e web (Expo Router + react-native-web).
Escolhido pelo ecossistema maduro, velocidade de desenvolvimento com reuso
máximo e presença nas lojas de apps. Alternativas descartadas: Flutter (web
menos madura), PWA puro (sem lojas, push limitado no iOS), nativo separado
(custo 3x).

## D-002 — Backend: Supabase
**Data:** 2026-07-02 · **Decidido por:** David

Postgres + Auth + Realtime + Edge Functions gerenciados. SQL relacional modela
bem vagas/agenda/pagamentos; regras críticas (escrow, multa, aceite atômico)
ficam em Edge Functions. Alternativas descartadas: Firebase (NoSQL modela mal
os relacionamentos; lock-in), backend próprio NestJS (2–3x mais lento para
entregar; pode ser reavaliado se o Supabase limitar).

## D-003 — Mercado Brasil; pagamentos simulados no MVP
**Data:** 2026-07-02 · **Decidido por:** David

Foco no mercado brasileiro (pt-BR, BRL, Pix futuramente). No MVP, todo o fluxo
financeiro (escrow, liberação, multa, saque) funciona com **saldo simulado** em
carteira interna; a integração com gateway real (Mercado Pago/Pagar.me) fica
para a Fase 3. Motivo: gateway real exige credenciais, KYC e aprovação — a
mecânica do produto pode ser validada antes dessa burocracia.

## D-004 — Conta única com dois papéis
**Data:** 2026-07-02 · **Decidido por:** David

Toda pessoa tem uma única conta e pode tanto anunciar vagas quanto prestar
serviços, coerente com a home de calendário (num horário livre: buscar bico OU
anunciar vaga). Reputação unificada por pessoa, com contexto por papel.
Alternativas descartadas: contas separadas por papel (modelo iFood) e conta com
papel primário.

## D-005 — Direção visual: Opção C, "Fintech" (roxo)
**Data:** 2026-07-02 · **Decidido por:** David

Na rodada 1 de design (`docs/design/rodada-01-direcao-visual.html`), David
escolheu a opção C: cabeçalho roxo sólido (#6D28D9) com cantos inferiores
arredondados, identidade forte inspirada em fintechs brasileiras (Nubank),
fundo branco e cartões suaves em lilás. Tokens implementados em
`apps/mobile/src/constants/theme.ts` (modo claro e escuro). Alternativas
descartadas: A (azul neutro estilo Uber) e B (verde acolhedor estilo iFood).

## D-006 — Entrada/cadastro: tela única com e-mail/senha + Google
**Data:** 2026-07-02 · **Decidido por:** David

Na rodada 2 de design (`docs/design/rodada-02-entrada-cadastro.html`), David
escolheu a opção A (tela única com e-mail e senha) **acrescida de entrada com
Google** ("entrar ou cadastrar com o Google"), pedindo a implementação da
funcionalidade. Implementado em `apps/mobile/src/features/auth/`: alternância
entrar/criar conta na mesma tela, login Google via OAuth (redirect na web,
fluxo PKCE com navegador no nativo). Requisito de configuração: ativar o
provedor Google no painel do Supabase quando o projeto for criado.
Alternativa descartada: fluxo passo a passo (opção B) e social-first (C).

## D-007 — Telas Buscar vagas e Anunciar vaga
**Data:** 2026-07-02 · **Decidido por:** David

Rodada 3 (`docs/design/rodada-03-buscar-anunciar.html`):
- **Buscar vagas — opção 2, "categorias primeiro":** grade de cartões grandes
  por tipo de serviço (ícone + nome); tocar numa categoria abre a lista de
  vagas dela. Uma decisão por vez, mínimo de leitura.
- **Anunciar vaga — opção 3, "formulário com prévia":** formulário compacto
  (categoria → descrição → quando → quanto → onde) com prévia ao vivo do
  anúncio exatamente como aparecerá na busca, antes de publicar.
Alternativas descartadas: busca por lista com filtros e por agenda;
anúncio em formulário único sem prévia e em passo a passo.

## D-008 — Telas do serviço em andamento e da Carteira
**Data:** 2026-07-03 · **Decidido por:** David

Rodada 4 (`docs/design/rodada-04-servico-carteira.html`):
- **Serviço em andamento — opção 2, "uma ação por vez":** cartão grande com o
  status atual e um único botão com a próxima ação possível para o papel do
  usuário (estilo Uber). Sem stepper.
- **Carteira — opção 2, "dois cartões":** "Disponível" e "A receber" lado a
  lado, extrato agrupado por dia com linguagem simples ("pagamento
  recebido", "valor reservado").
Alternativas descartadas: linha do tempo de 4 passos; saldo único com
extrato corrido.

## D-009 — Avaliação híbrida e perfil com nota por papel
**Data:** 2026-07-03 · **Decidido por:** David

Rodada 5 (`docs/design/rodada-05-avaliacao-perfil.html`):
- **Avaliação — misto das duas opções:** estrelas grandes com rótulo em
  palavras + **marcadores prontos que mudam conforme a nota** (nota alta →
  elogios como "Pontual", "Caprichou"; nota baixa → problemas como
  "Atrasou", "Serviço incompleto"), adaptados ao papel do avaliado, +
  comentário livre opcional. Marcadores gravados em `reviews.tags`.
- **Perfil — opção 2, nota separada por papel:** dois cartões (como
  prestador × como anunciante), cada um com média, nº de avaliações e
  serviços concluídos, seguidos das avaliações recentes.

## D-010 — Perfil: nota única em duas versões alternáveis (substitui o perfil de D-009)
**Data:** 2026-07-03 · **Decidido por:** David

O perfil deixa de mostrar os dois cartões lado a lado e passa a ter **duas
versões alternáveis** (Prestador × Anunciante), cada uma no estilo "nota
única em destaque" da rodada 5: a média grande, o nº de avaliações, os
comentários recebidos **naquele papel** e o total de serviços
**finalizados** no papel. **Regra anti-manipulação:** nunca exibir o total
de vagas anunciadas — só as concluídas — para impedir que alguém crie e
cancele muitas vagas para inflar números e passar falsa impressão de
atividade.

## D-011 — Versão do perfil escolhida pelo contexto (ajusta D-010)
**Data:** 2026-07-03 · **Decidido por:** David

O perfil NÃO tem seletor manual: **a plataforma escolhe a versão conforme o
contexto**. Quem abre o perfil do autor de uma vaga vê o perfil **como
anunciante**; quem abre o perfil de um prestador (ex.: o anunciante vendo
quem aceitou) vê o perfil **como prestador**. Na própria aba Perfil, a
plataforma mostra o papel com mais serviços finalizados (empate →
prestador). Nota de coerência: o nº de avaliações exibido nunca pode
superar o de serviços finalizados no papel — o banco já garante isso (uma
avaliação por serviço, apenas do contraparte); dados de demonstração devem
respeitar a mesma regra.

## D-012 — Candidatura com aprovação (modelo Uber) e bloqueio entre usuários
**Data:** 2026-07-03 · **Decidido por:** David

Substitui o aceite direto de D-007/D-008: o prestador **se candidata**; a
vaga fica travada (ninguém mais se candidata); o anunciante é notificado e
**aceita ou recusa** o candidato — sem escolher entre vários, um por vez,
como no Uber. Recusa: sem multa, vaga reabre, e o recusado nunca mais vê ou
se candidata àquela vaga específica (outras vagas do mesmo anunciante
continuam normais). Escrow passa a ser retido na aprovação. Nova
funcionalidade de MVP: **bloqueio entre usuários** (docs/02 §8) — esconde
vagas nas duas direções, impede candidaturas e bloqueará mensagens (chat
simples também entra no MVP). Notificação de candidatura no MVP é dentro do
app; push na Fase 2.

## D-013 — Taxa de serviço paga na criação da vaga; prestador vê o líquido
**Data:** 2026-07-03 · **Decidido por:** David

O anunciante paga o valor total **na criação da vaga**: taxa de serviço
(fica com a empresa, não reembolsável) + valor líquido (escrow do
prestador). O prestador sempre vê e recebe o **líquido** integral pelo qual
se candidatou (busca, prévia da criação, detalhe, carteira). A taxa aparece
explícita na criação. Se ninguém for aprovado (sem candidatos, todos
recusados, ou vaga excluída antes de aprovar), reembolsa-se apenas o
líquido. Racional: impede recusar todo mundo para reaver 100% do valor —
arrepender-se custa a taxa. Percentual usado como exemplo: 10% (valor final
⚠️ dúvida #2). Consequência técnica: escrow deixa de ser retido na
aprovação (D-012) e passa para a criação; `gigs.price_cents` = líquido,
nova coluna `fee_cents`.

## D-014 — Anunciante escolhe o valor do prestador; taxa somada por cima (ajusta D-013)
**Data:** 2026-07-03 · **Decidido por:** David

Inverte a direção do cálculo de D-013: em vez de escolher um valor bruto do
qual a taxa é descontada, o anunciante **escolhe o valor exato que o
prestador receberá (x)** e paga **x + taxa** ao confirmar a vaga. Exemplo
ilustrativo: prestador recebe R$ 100, taxa R$ 10, anunciante paga R$ 110.
Tela de criação: "O prestador recebe R$ 100 · Taxa de serviço + R$ 10 ·
Você paga R$ 110". Reembolso continua sendo apenas o valor do prestador.

## D-015 — Carteira: saldo único, seção "em processamento" e histórico separado
**Data:** 2026-07-03 · **Decidido por:** David

A tela atual da carteira ("recebido" vs "a receber") é confusa. Nova
estrutura (docs/02 §5.2): a carteira mostra **só o saldo disponível para
saque** (recebido desde o último saque); serviços ainda não prestados não
aparecem nela. Serviço concluído entra na hora, mas numa seção separada
**"Em processamento"** por um prazo de alguns dias (duração ⚠️ dúvida #16)
— janela para o anunciante pedir reembolso por serviço malfeito, analisado
e aceito ou negado (§6). Após o prazo o valor vira saldo disponível, que
pode ser **sacado** (Pix; outras opções de pagamento digital a avaliar —
dúvida #17) ou **usado, integral ou parcialmente, para criar vagas**. O
extrato completo fica atrás de um botão **"Ver histórico"**.

## D-016 — Prazo de processamento de 7 dias; direção dos meios de pagamento
**Data:** 2026-07-03 · **Decidido por:** David

Complementa D-015: o prazo em que o valor de um serviço concluído fica "em
processamento" (janela de pedido de reembolso do anunciante) é de **7 dias,
inicialmente** — valor de partida, revisável com o uso real.

Meios de pagamento (pagar vaga / sacar saldo): oferecer **as opções mais
populares do Brasil** — Pix, cartão de crédito e débito e carteiras
digitais (Mercado Pago, PicPay etc.). Pesquisa de mercado feita em
2026-07-03 (fontes na dúvida #17): Pix domina (~55% das transações no 2º
sem/2025; ~49% do e-commerce), cartões em seguida (~30%), e as carteiras
mais usadas/confiáveis são PayPal, Mercado Pago e PicPay. Direção prática
para a Fase 3: lançar com **Pix + cartões** (cobertos por qualquer gateway
brasileiro — dúvida #13) e adicionar carteiras conforme o suporte do
gateway. No MVP nada muda (pagamentos simulados).

## D-017 — Editar/excluir vaga: valor imutável; reembolso do líquido na exclusão
**Data:** 2026-07-03 · **Decidido por:** Claude (derivado de D-013/D-014; validação do David ⚠️ dúvida #18)

Implementa o CRUD da vaga (docs/02 §2.2). **Excluir**: permitido antes de
aprovar alguém (aberta ou candidato pendente) — o valor do prestador é
reembolsado e a taxa fica com a empresa, exatamente como D-013 define.
**Editar**: só com a vaga aberta e sem candidato; categoria, título,
descrição, horário e local. **O valor não é editável**: ele corresponde ao
pagamento já feito na criação — permitir mudá-lo obrigaria a decidir se a
taxa acompanha (contradiz "não reembolsável" ao baixar) ou não (taxa
descolada do valor). Para mudar o valor: excluir e recriar. Técnica:
edição/exclusão via Edge Functions; política de UPDATE do cliente removida
(migration 0007 — fechava brecha de editar `price_cents` direto);
migration 0008 ajusta a invariante de `worker_id` para permitir cancelar
vaga que nunca teve prestador.

## D-018 — Multa de cancelamento pós-aprovação: 25% (piso R$ 10), 80% ao prestador
**Data:** 2026-07-03 · **Decidido por:** David

Quando o anunciante cancela um serviço **depois de aprovar o candidato**
(aceito ou em andamento): o valor do prestador volta para o anunciante (o
serviço não vai acontecer; a taxa da criação continua com a empresa) e uma
**multa de 25% do valor do prestador, com piso de R$ 10**, é cobrada por
cima. Do valor da multa, **80% compensa o prestador lesado** (que bloqueou
o horário na agenda) e **20% fica com a plataforma**. Exemplo: vaga de
R$ 100 cancelada → anunciante recebe os R$ 100 de volta, paga R$ 25 de
multa; prestador recebe R$ 20; plataforma fica com R$ 5 (+ R$ 10 da taxa).
Excluir a vaga (delete-gig) segue impossível após a aprovação — o único
caminho é o cancelamento com multa. Fecha a dúvida #1.

## D-019 — Valor mínimo de vaga: R$ 10; multa apresentada como compensação
**Data:** 2026-07-03 · **Decidido por:** David

**Nenhuma vaga pode pagar menos de R$ 10** ao prestador: serviços
quase-gratuitos abririam espaço para uso malicioso (ex.: publicar "vagas"
como anúncios). O mínimo coincide com o piso da multa (D-018). Validação
no formulário, nas functions (create/update) e constraint no banco
(migration 0009). Além disso, o aviso de cancelamento NÃO expõe a divisão
80/20 da multa (D-018, que segue valendo internamente): a interface
apresenta **o valor total da multa como compensação pelo prestador
lesado**.

## D-020 — Cancelamento: uma única operação por pessoa (multa já deduzida)
**Data:** 2026-07-03 · **Decidido por:** David (ajusta D-018)

No cancelamento pós-aprovação, o anunciante NÃO recebe o reembolso
integral seguido de uma cobrança de multa (duas operações): ele recebe
**um único reembolso já com a multa deduzida** (ex.: vaga de R$ 100 →
volta R$ 75), e o prestador lesado **é pago diretamente** na sua parte
(R$ 20 no exemplo). No extrato, cada pessoa vê um único lançamento. Numa
vaga de valor mínimo (R$ 10), a multa consome todo o reembolso e nenhum
lançamento de reembolso é criado. A mecânica 25%/piso/80-20 de D-018
continua igual — muda a forma de lançar e apresentar.

## D-021 — Carteira: escolhida a Opção C da rodada 6 (abas), saldo entra no pagamento
**Data:** 2026-07-03 · **Decidido por:** David

Da rodada 6 (`docs/design/rodada-06-carteira.html`), David escolheu a
**Opção C — duas abas** ("Disponível" e "Em processamento"), **sem** o
botão "Usar saldo ao anunciar": o saldo aparece **na hora do pagamento do
anúncio** (quadro da taxa na criação da vaga). Implementação: saldo único
em destaque ("recebido desde o último saque"), abas com as listas, botão
"Sacar via Pix" fixo embaixo (saque simulado no MVP via função `withdraw`,
que zera o disponível), extrato completo na tela "Histórico". A liberação
dos 7 dias (D-016) é DERIVADA do ledger (`created_at + 7 dias`), sem job:
`escrow_release` recente conta como "em processamento"; compensações,
reembolsos e demais lançamentos entram no disponível imediatamente.

## D-022 — Expiração automática de vaga no horário de início, com reembolso
**Data:** 2026-07-03 · **Decidido por:** Claude (deriva de D-013; ajustes bem-vindos)

Vaga que chega ao **horário de início** sem ninguém aprovado (aberta ou
com candidato pendente não decidido) **expira automaticamente**: o valor
do prestador volta ao anunciante e a taxa fica com a empresa (mesma regra
do reembolso de D-013). Racional para expirar no INÍCIO (e não no fim) do
horário: o serviço já não pode acontecer como anunciado, e esperar só
atrasaria o reembolso. Implementação: job `pg_cron` a cada 5 minutos
(função SQL `expire_due_gigs`, atômica, sem reembolso duplo); a busca
nunca mostra vagas já iniciadas (a view filtra por `starts_at > now()`) e
o `apply-gig` também recusa, então ninguém vê vaga "morta" entre as
execuções do job.

## D-023 — Mapa: rodada 7 opção A (tela cheia estilo Uber); MapLibre + Nominatim
**Data:** 2026-07-06 · **Decidido por:** David

Da rodada 7 (`docs/design/rodada-07-mapa.html`), David escolheu a **Opção
A**: tocar em "ONDE?" abre o mapa em **tela cheia com pino fixo no centro**
(a pessoa arrasta o mapa por baixo, padrão Uber/iFood), busca de endereço
no topo, endereço lido na hora embaixo e botão único "Confirmar este
local". Visualização: endereço clicável abre modal com o pino (padrão da
spec §2.1). Provedor aprovado: **MapLibre GL** (um código para web e app;
no app via WebView no MVP — sem módulo nativo, funciona no Expo Go),
**tiles abertos sem chave** (OpenFreeMap no MVP; migrar para MapTiler com
chave própria no pré-lançamento) e **Nominatim/OpenStreetMap** para busca
e leitura de endereço (gratuito, sem chave). Mapa isolado em componente
próprio para troca barata de provedor (docs/03).

## D-024 — Escolha entre múltiplos candidatos, anonimizados até a escolha
**Data:** 2026-07-06 · **Decidido por:** David (substitui D-012; fecha a dúvida #19)

A vaga **continua aberta e visível juntando candidatos**; o anunciante
**escolhe um** entre eles (ou recusa individualmente). Muda o paradigma de
D-012 (um candidato por vez travava a vaga). Regras:

- **Anonimato até a escolha (LGPD/antidiscriminação):** o anunciante NÃO vê
  foto, nome completo, idade nem qualquer dado que ligue o candidato a uma
  pessoa específica. Vê apenas o relevante para o serviço: **primeiro
  nome, nota como prestador, nº de avaliações, total de serviços
  prestados e os elogios pré-prontos mais frequentes** (ex.: "Pontual",
  "Caprichou no serviço"). Gênero entra quando o perfil coletar esse dado
  (edição de perfil ainda não existe). Sem página de perfil clicável e sem
  ID real exposto: os dados fluem por função de servidor que devolve só o
  id da candidatura (aleatório, por vaga) — impossível montar URL do
  perfil real. Após a escolha, o vínculo existe e o perfil completo passa
  a ser visível como hoje.
- **Candidatura não trava mais a agenda** do prestador (ele pode se
  candidatar a várias vagas); só a ESCOLHA trava. A escolha re-checa o
  conflito de agenda e auto-recusa candidato que ficou ocupado.
- **Recusa individual** segue permanente por vaga e sem multa; os demais
  candidatos de uma vaga que escolheu alguém ficam "não escolhidos" (podem
  se candidatar a outras vagas normalmente).
- Técnica: tabela `gig_candidacies` substitui `gig_refusals` e o status
  `pending_approval` (que vira legado); RLS não dá SELECT ao anunciante —
  a lista vem anonimizada da função `get-candidates`.

## D-025 — Chat: rodada 9 opção B (conversa clássica + respostas prontas)
**Data:** 2026-07-06 · **Decidido por:** David

Da rodada 9 (`docs/design/rodada-09-chat.html`), David escolheu a **Opção
B**: tela dedicada de conversa com bolhas (estilo WhatsApp, mensagens
próprias em roxo à direita) e uma fileira de **respostas prontas de um
toque** acima do teclado ("Estou chegando", "Cheguei", "Pode me ligar?",
"Vou me atrasar um pouco", "Tudo certo por aqui 👍") — quem escreve com
dificuldade resolve a coordenação do dia do serviço com um dedo.
Complementos implementados: entrega em tempo real (Realtime + polling de
reserva), botão "Conversar com {nome}" na tela do serviço com **contador
de mensagens novas** (marcas de leitura por usuário, RLS própria), e as
regras de D-024/§8 no banco: conversa só entre anunciante e o prestador
ESCOLHIDO, remetente não falsificável, bloqueio corta o envio nos dois
sentidos, mensagens imutáveis.

## D-026 — A conversa encerra na conclusão do serviço
**Data:** 2026-07-06 · **Decidido por:** David (ajusta D-025)

Ao fim do serviço, as partes **não podem mais se comunicar** pelo app: o
envio de mensagens vale só enquanto o serviço está em curso (aceito, em
andamento ou aguardando confirmação) — cortado no banco (migration 0015).
O **histórico continua legível** para os dois (registro para disputas,
§6); na conclusão o botão vira "Ver conversa" e o chat mostra "a conversa
foi encerrada", sem campo de envio. Verificado e2e no ciclo completo.

## D-027 — Prestador que cancela paga multa espelhada; cartão na Fase 3
**Data:** 2026-07-06 · **Decidido por:** David (fecha as dúvidas #5 e #18)

**Valor da vaga segue imutável** (confirma D-017 — dúvida #18 encerrada).
**Prestador que cancela** um serviço aceito/em andamento paga **multa igual
à do anunciante** (D-018): 25% do valor da vaga, piso de R$ 10,
**restituindo o anunciante** — espelhado: 80% da multa vai ao anunciante
lesado, 20% à plataforma, apresentada pelo total como compensação (D-019).
O anunciante ainda recebe **o valor integral do prestador de volta**
(o serviço não vai acontecer; a taxa da criação segue não reembolsável —
a compensação de 80% sempre a cobre, pois 20% do valor ≥ taxa de 10%).
No MVP a multa é debitada da carteira simulada do prestador (pode ficar
negativa); a **cobrança real no cartão** do prestador quando o saldo não
cobrir entra com o gateway da **Fase 3** (requisito registrado no
roadmap). Verificado e2e.

## D-028 — Desenho da Fase 2 (confiança): disputas, 48h, código de check-in, endereço aproximado
**Data:** 2026-07-06 · **Decidido por:** David (fecha as dúvidas #4, #6, #7 e #8)

1. **Disputas/reembolsos**: analisadas pelo **David num painel admin
   simples** (web): cada caso mostra relato, fotos, conversa do chat e
   histórico das duas partes; decisão com um clique.
2. **Reembolso parcial ou total**, a critério de quem analisa, **sempre
   limitado ao valor do serviço** — a taxa nunca é reembolsada. O que não
   for reembolsado é liberado ao prestador.
3. **Auto-liberação em 48h**: se o anunciante não confirmar nem contestar
   a conclusão, o pagamento libera sozinho (encerra a janela de
   contestação pré-liberação; a janela de 7 dias da carteira — D-016 —
   continua valendo para o pedido de reembolso pós-liberação).
4. **Endereço aproximado antes da escolha** (segurança): a vaga mostra só
   bairro/região e pino aproximado; o endereço completo e o pino exato
   aparecem apenas para o prestador ESCOLHIDO.
5. **Check-in por código**: ao chegar, o prestador digita o código de 4
   dígitos exibido na tela do anunciante (estilo iFood/99) para iniciar o
   serviço — prova de presença que alimenta as disputas.
6. **Pedido de reembolso**: relato em texto obrigatório + até 5 fotos
   opcionais; análise considera também o chat e o histórico.

## D-029 — Busca por região: GPS + ajuste manual, raio de ~30 km, mais próximas primeiro
**Data:** 2026-07-06 · **Decidido por:** David

As vagas **não aparecem para o país todo**: quem vive no RJ não vê vaga de
SP. Regras: (1) o app sugere a região pela **localização do aparelho** e a
pessoa pode **ajustar manualmente no mapa** quando quiser (fica salva;
negar o GPS cai no modo manual); (2) alcance por **raio ajustável, padrão
~30 km** (cobre cidade + região metropolitana; ajustável ~5–100 km); (3)
dentro do raio, ordena por **proximidade** e o cartão mostra a distância
aproximada ("≈ 3 km"), calculada do **pino aproximado** (o endereço exato
segue protegido — D-028). A localização do usuário serve só para filtrar:
nunca é exibida a terceiros. Entra como bloco 2.8 da Fase 2, junto do 2.3
(endereço aproximado), que mexe nas mesmas colunas.

## D-030 — Endereço aproximado: garantia por RLS, deslocamento fixo de 250–600 m, círculo no mapa
**Data:** 2026-07-06 · **Decidido por:** Claude (implementação do item 4 do D-028)

Como o item 4 do D-028 foi implementado (bloco 2.3):

1. **Garantia no banco, não na interface** (mesmo princípio do código de
   check-in): o endereço exato sai da tabela pública `gigs` e vai para
   `gig_addresses` (migration 0017), legível por RLS apenas pelo
   anunciante e pelo prestador designado. `gigs` guarda só o rótulo da
   região (`area`) e o pino aproximado (`approx_lat`/`approx_lng`).
2. **Deslocamento aleatório de 250–600 m, calculado UMA vez na criação**
   e gravado — recalcular a cada leitura permitiria recuperar o ponto
   real tirando a média de várias leituras.
3. **Rótulo da região derivado do endereço** no formato do geocodificador
   ("Rua X, 120 — Bairro, Cidade" → parte após o "—"); sem essa parte,
   cai num rótulo genérico para nunca vazar o nome da rua.
4. **No mapa, círculo translúcido em vez de pino** (padrão Airbnb): pino
   comunicaria ponto exato. Nota fixa: "Local aproximado — o endereço
   exato aparece quando você é escolhido."
5. A edição da vaga atualiza o exato e recalcula o aproximado; o
   formulário de criação/edição continua com o pino exato (só o
   anunciante o vê) e o cartão de pré-visualização mostra a região, como
   os candidatos verão. Verificado e2e (8 checks) em 2026-07-06.

## D-031 — Disputas: uma por vaga, evidência imutável, chat pausado, congelamento derivado
**Data:** 2026-07-06 · **Decidido por:** Claude (implementação dos itens 1–3 e 6 do D-028)

Como o backend de disputas (bloco 2.4) foi implementado:

1. **Uma disputa por vaga, para sempre** (constraint no banco) — espelha o
   princípio do reembolso único (D-020) e impede reabertura infinita.
2. **Dois momentos, um só fluxo**: em `awaiting_confirmation` a
   contestação move a vaga para o status `disputed` (o job de 48h só
   libera `awaiting_confirmation`, então o escrow congela sozinho); em
   `completed` dentro dos 7 dias (D-016) vira pedido de reembolso e o
   congelamento é **derivado**: disputa aberta → o pagamento daquela vaga
   aparece "em análise pela plataforma" na carteira e fica fora do saque,
   mesmo passados os 7 dias. Se a auto-liberação vencer a corrida por
   segundos, a contestação vira pedido de reembolso automaticamente.
3. **Relato obrigatório de 20–2000 caracteres** + até 5 fotos num bucket
   privado (`dispute-photos`): cada um envia só na própria pasta, as
   partes e o admin leem, e **ninguém apaga** (sem policy de delete) —
   evidência anexada é imutável, como o chat.
4. **Chat pausado durante a disputa**: com a vaga em `disputed` ninguém
   envia mensagem (a policy de envio não inclui o status); o histórico
   segue legível para os dois e para a análise. Evita pressão/assédio com
   o caso aberto — a comunicação passa a ser com a plataforma.
5. **Resolução atômica e limitada**: `resolve-dispute` exige
   `profiles.is_admin` (flag manual até o painel 2.5), trava a disputa
   (`open → resolved`, só a primeira decisão move dinheiro) e aplica:
   pré-liberação → reembolso X ao anunciante + `escrow_release` de
   líquido−X ao prestador (reentra nos 7 dias de processamento);
   pós-liberação → uma operação por pessoa (D-020): prestador −X,
   anunciante +X. X entre 0 (improcedente) e o valor do serviço — a taxa
   nunca é reembolsada (D-028). Verificado e2e (15 checks) em 2026-07-06.

## D-032 — Provas de conclusão do prestador + 3 camadas contra punição injusta
**Data:** 2026-07-06 · **Decidido por:** David (pergunta dele sobre o golpe da "foto antiga" e o celular sem bateria)

**Problema 1 — golpe da foto antiga:** um anunciante mal-intencionado tira
fotos ANTES do serviço, contesta dizendo que nada foi feito e envia as
fotos antigas como "prova".

**Salvaguarda:** ao tocar "Concluí o serviço", o prestador pode anexar
**fotos de como ficou + relato do que foi feito** — **opcionais,
encorajados** (decisão do David: sem atrito obrigatório; a tela explica
que anexar protege). O que dá força à prova é o **horário de envio do
servidor** (a data interna da foto é falsificável; o momento do upload
não): prova enviada na conclusão vale mais que "prova" que só aparece na
abertura da disputa. Mesmas regras de evidência da disputa: bucket
privado, pasta própria, partes+admin leem, **ninguém apaga**. Aparece no
painel admin (2.5) ao lado das provas da disputa, com os horários.

**Problema 2 — celular sem bateria/internet/quebrado na hora de
finalizar.** Decisão do David: **3 camadas**:

1. **Concluir atrasado nunca pune**: o prestador finaliza quando voltar a
   ter sinal; se o serviço já passou sozinho para "aguardando
   confirmação" (camada 3), o toque tardio apenas **anexa as provas** —
   nunca dá erro. Os horários ficam visíveis à análise.
2. **O anunciante pode confirmar direto do "em andamento"** (com
   confirmação em dois toques): o caminho feliz não depende do celular do
   prestador — o pagamento é liberado na hora.
3. **Rede de segurança**: job (15 min) move "em andamento" →
   "aguardando confirmação" **12h após o horário previsto de fim**; daí
   correm as 48h de auto-liberação (D-028). Pior caso (celular morto E
   anunciante sumido): o pagamento chega sozinho, e o anunciante mantém
   toda a janela para confirmar ou contestar.

Nota registrada: "um trabalho de cada vez" já era garantido — a escolha
re-verifica a agenda do candidato e recusa conflito de horário (D-024).
Verificado e2e (7 checks) em 2026-07-06.

## D-033 — Painel admin de disputas: rodada 11, opção A (fila + caso lado a lado)
**Data:** 2026-07-06 · **Decidido por:** David (rodada 11 de design)

O painel (`/admin`, web) usa o layout **estilo caixa de e-mail**: fila à
esquerda (abertas primeiro, mais antigas no topo; resolvidas recentes
abaixo), caso à direita com **acusação × defesa em colunas espelhadas** —
relato e fotos do anunciante de um lado, provas de conclusão do prestador
do outro, ambos com o **horário de envio** em destaque (D-032: a
cronologia é o argumento). Contexto no topo (check-in, reputação das duas
partes), conversa completa expansível, decisão fixa embaixo: **Reembolso
total · valor livre + Reembolso parcial · Improcedente — liberar**, com
confirmação em dois cliques (dinheiro nunca se move num clique acidental).
Acesso: `profiles.is_admin` (conta do David marcada) — e o RLS garante no
banco que não-admins não leem nada, mesmo alcançando a rota. Admin também
lê o chat e o estado do check-in (migration 0020) — leitura apenas: a
plataforma não participa da conversa.

## D-034 — Prioridade para lesados: no PERÍODO do serviço cancelado
**Data:** 2026-07-06 · **Decidido por:** David

Quando o anunciante cancela um serviço já aceito/em andamento, o
prestador lesado — além da multa (D-018), que compensa o dinheiro —
ganha **prioridade nas candidaturas a vagas que SOBREPÕEM o horário do
serviço cancelado**: recupera exatamente o buraco aberto na agenda dele.

Decisão do David sobre o escopo: a prioridade vale **só no período
cancelado**, não por N dias — uma prioridade longa inflacionaria (muita
gente prioritária = ninguém prioritário). **Prioridade de usuário ampla
fica reservada como possível recurso PREMIUM futuro** (expansão do
serviço, anotada na Fase 4 do roadmap).

Mecânica: o cancelamento cria uma "janela de prioridade" (trigger no
banco; expira sozinha quando o horário passa). Na lista de candidatos, o
prioritário vem **no topo com selo "⚡ Destaque — teve um serviço
cancelado neste mesmo horário"** — ordena e destaca, não esconde nem
escolhe por ninguém. O prestador vê o aviso "você tem prioridade nesta
vaga" no detalhe da vaga e na notificação do cancelamento. **Nome voltado ao usuário: "destaque"**
(decisão do David em 2026-07-06; "prioridade" fica como termo interno).
Verificado
e2e em 2026-07-06 (janela criada no cancelamento, prioritário reordenado
na lista sobreposta mesmo se candidatando por último, sem efeito em
horários que não sobrepõem, RLS de janelas só para o próprio).

## D-035 — Desenho da Fase 3: Pix-only, modelo A (subcontas/split), taxa oficial 10%, sandbox até o CNPJ
**Data:** 2026-07-06 · **Decidido por:** David

1. **Taxa da plataforma: 10% oficial** (fecha a dúvida #2; era exemplo
   desde D-013). Com Pix custando ~1% por transação, margem confortável.
2. **Pix-only no lançamento**: anunciante paga por QR dinâmico, prestador
   recebe na chave Pix. Cartão entra depois — junto com ele a cobrança
   real da multa do prestador sem saldo (D-027); até lá, carteira
   negativa/compensação em recebimentos futuros.
3. **Modelo A — subcontas/split no provedor**: cada prestador tem uma
   subconta/conta de recebedor no provedor; o dinheiro **nunca passa
   juridicamente pela conta do Vinc** (a custódia é da instituição de
   pagamento autorizada — risco regulatório mínimo). Candidatos: Mercado
   Pago e Pagar.me (marketplace maduro, recebedor pessoa física com CPF);
   a escolha contratual final acontece na obtenção do CNPJ (dúvida #13).
4. **Disputas/reembolsos no modelo A — confirmado que funcionam, com
   adaptações** (esclarecimento pedido pelo David):
   - A regra de ouro: o **ledger interno continua a fonte de verdade das
     decisões**; o provedor executa os movimentos líquidos.
   - **Retenção**: a cobrança entra com split marcado mas com liberação
     CONTROLADA pela plataforma; a confirmação do anunciante (ou o job de
     48h) dispara a liberação via API.
   - **Janela de 7 dias (D-016)**: no modelo A ela vira literal — a
     liberação real ao prestador só acontece quando a janela fecha sem
     pedido de reembolso. O desenho da Fase 2 ("em processamento") casa
     perfeitamente, sem mudança de produto.
   - **Disputa**: liberação fica suspensa (status disputed); resolução =
     devolução Pix parcial/total ao anunciante via API + liberação do
     restante ao prestador. Devolução Pix tem prazo regulatório de 90
     dias — folga enorme sobre nossos 7 dias + análise.
   - **Multas**: pagas a partir do valor ainda retido (cancelamento do
     anunciante: devolução com multa deduzida + repasse da compensação ao
     prestador — uma operação por pessoa, D-020).
   - Prazos exatos de liquidação/estorno podem variar por provedor; o
     David aceitou adaptá-los mantendo as regras de produto.
5. **Sem CNPJ ainda**: desenvolvimento 100% em **sandbox**, atrás de uma
   porta `PaymentProvider` no backend — implementação `simulated` (a
   atual) e `gateway` (sandbox), trocáveis por configuração. Quando o
   CNPJ existir, "plugar" é: contratar o provedor, trocar credenciais e
   ativar o adapter em produção.

## D-036 — Destino do saque na carteira: rodada 14, opção A (linha discreta no rodapé)
**Data:** 2026-07-09 · **Decidido por:** David

Da rodada 14 (`docs/design/rodada-14-destino-saque.html`), David escolheu
a **Opção A**: uma linha discreta acima do botão "Sacar via Pix" mostra a
chave Pix cadastrada **mascarada** (ex.: `b•••@email.com`) com o atalho
"alterar"; sem chave cadastrada, a linha vira aviso e o botão principal
passa a ser "Cadastrar chave Pix", levando direto à tela do bloco 3.3 —
o prestador descobre a pendência ANTES de tentar sacar, não depois.
Alternativas descartadas: cartão de destino no topo (B, roubava espaço da
lista) e destino só na confirmação do saque (C, quem nunca saca não
descobre a pendência). A máscara é função pura no domínio
(`maskPixKey` em `packages/core/src/payout.ts`).

## D-037 — Carteira separada dos custos de anúncio (revê parte de D-021)
**Data:** 2026-07-09 · **Decidido por:** David

Gatilho: David notou que a lista "Disponível" (R$ 20 + R$ 150) não somava
o saldo exibido (R$ 165) — a diferença era uma taxa de −R$ 5 de uma vaga
anunciada pela própria pessoa, que debitava o saldo sem aparecer na lista.
Com o pagamento real (Fase 3), o anúncio é pago **por Pix na publicação**;
manter o débito na carteira cobraria a pessoa duas vezes.

Decisão: **a carteira guarda só o dinheiro que o usuário recebeu**
(`escrow_release`, `fine` ±) menos saques (`withdrawal`). Os lançamentos
do lado do anúncio (`fee`, `escrow_hold`, `refund`) acontecem fora da
carteira — Pix na ida e na volta — e aparecem apenas no extrato. Com isso
a lista "Disponível" **sempre soma o saldo exibido** (multas do prestador
aparecem como débito na lista). Fica revogada a parte de D-021 em que o
saldo abatia o pagamento do anúncio (exigiria cobrança parcial +
transferência interna no provedor; pode voltar como melhoria futura).
Alternativa descartada: manter o abatimento (complexidade alta no modelo
A de subcontas para um ganho pequeno no MVP).

## D-038 — Chave Pix obrigatória na criação da conta
**Data:** 2026-07-09 · **Decidido por:** David

"A pessoa deve informar a chave Pix (ao menos a inicial) no ato de
criação de conta, para não haver quem não consiga sacar; a chave segue
alterável depois." Formato definido pelo David na rodada 15 (variante
própria): o cadastro pede o **CPF** com uma caixa **"usar meu CPF como
chave Pix" marcada por padrão**; ao desmarcar, aparecem o tipo (celular /
e-mail / aleatória) e o campo da chave, validados antes de criar a conta.
Quem entra **com Google** — ou conta antiga sem chave — cai num **passo
obrigatório de conclusão** ("Falta só uma coisa") no primeiro acesso,
com a mesma seção de CPF + chave e a opção de sair da conta. A troca
posterior continua em perfil → "Receber pagamentos" (3.3/D-036).

## D-039 — Desistência de candidatura, sem spam de notificação e lista por relevância
**Data:** 2026-07-09 · **Decidido por:** David (proposta do Claude aprovada com regras extras)

1. **Desistir**: o prestador pode cancelar a própria candidatura enquanto
   ela está `pending` — sem punição (a vaga segue aberta e nada estava
   bloqueado); a candidatura vira `withdrawn` e some da lista do
   anunciante. Depois de escolhido, sair do serviço é cancelamento com
   multa (D-027), nunca por aqui.
2. **Recandidatura**: permitida enquanto a vaga estiver aberta
   (`withdrawn` → `pending`, com a data da nova candidatura). Recusado
   pelo anunciante continua sem volta (D-024).
3. **Sem spam de notificação** (regra do David): existe no máximo **uma
   notificação "novo candidato" NÃO LIDA por vaga** — se o anunciante
   ainda não viu a anterior, candidaturas novas (inclusive
   recandidaturas) não criam outra. Lida a notificação, o próximo
   candidato notifica de novo. Desistir não notifica ninguém.
4. **Lista por relevância** (regra do David, anti-manipulação): a ordem
   dos candidatos é Destaque (D-034) → **total de serviços concluídos** →
   **avaliação** → antiguidade só como desempate. A hora da candidatura
   deixa de ser o critério, então desistir e voltar não melhora posição.

Implementação: migration 0026 (status `withdrawn` + trigger de
notificação com dedup), function `withdraw-candidacy`, `apply-gig` aceita
recandidatura, `get-candidates` reordenado, botão "Desistir da
candidatura" (2 toques) no detalhe da vaga. Verificado e2e (9 checks).

## D-040 — Publicar é grátis; o Pix acontece na ESCOLHA; taxa só no serviço realizado
**Data:** 2026-07-09 · **Decidido por:** David ("Aprovo o plano completo"; pesquisa em `08-pesquisa-cobranca-taxa.md`)

Substitui o pagamento na publicação (D-013/D-014) pelo padrão vencedor do
mercado (Airtasker/Workana/Triider/Uber): **a plataforma só ganha quando
o serviço acontece**.

1. **Publicar é grátis** — a vaga nasce `open`, sem Pix, sem lançamentos.
   Anunciar casualmente vira convite (cold start).
2. **O Pix (valor + taxa) acontece na escolha do candidato**: a vaga fica
   `pending_payment` segurando a candidacia escolhida por **30 minutos**
   (`pending_candidacy_id` + `choice_pending_since`); o provedor simulado
   confirma na hora e o gateway finaliza via `payment-webhook`. Na
   confirmação: aceite, ledger (fee + escrow_hold), código de check-in,
   endereço/chat liberados e SÓ ENTÃO a notificação "escolhido" — o
   candidato nunca fica sabendo de escolha não paga ("vaga fantasma" não
   frustra ninguém).
3. **Escolha não paga expira em 30 min** (job SQL a cada 5 min) e a vaga
   REABRE com os candidatos; um Pix atrasado num QR velho é devolvido
   INTEGRALMENTE pelo webhook (claim atômico na cobrança — sem devolução
   dupla). Candidato que desistiu/ocupou durante a janela → mesma coisa.
4. **Nada de dinheiro antes da escolha**: exclusão e expiração de vaga
   aberta não movem dinheiro nem escrevem no ledger. Multas e disputas
   pós-escolha seguem D-018/D-027/D-028.
5. **Anti-spam/anúncio externo** (substitui o papel do Pix na entrada):
   filtro de contato (telefone/e-mail/link/messenger) em título e
   descrição (`containsContactInfo` no domínio, aplicado em criar/editar);
   limite de vagas abertas simultâneas (3 sem histórico de anunciante,
   10 com); denúncia de vaga (`gig_reports`, 1 por usuário/vaga, leitura
   de admin); 1 CPF = 1 conta (D-038); contato/endereço só após o
   pagamento (D-028/D-030).
6. **Cold start orgânico**: promo "taxa R$ 0" no lançamento (constante em
   pricing.ts, item no checklist de pré-lançamento), lançamento
   concentrado por região, empty states que convidam a anunciar ("é
   grátis") — nunca conteúdo falso.

Detalhe técnico: `gig_payments` passou a aceitar várias cobranças por
vaga (id próprio; a mais recente é a ativa) e ganhou o status `refunded`.

## D-041 — Fechamento de dúvidas: agenda bloqueia, avaliações sem texto, categorias iniciais, Vinc definitivo
**Data:** 2026-07-09 · **Decidido por:** David ("3A, 10A, 9 Aprovado, 12 Sim, rodada agora")

1. **Conflito de agenda (dúvida #3): BLOQUEIO confirmado.** O prestador
   não consegue se candidatar a vaga que conflita com compromisso
   confirmado, e a escolha re-checa e auto-recusa quem ficou ocupado
   (já implementado assim; candidaturas pendentes não travam nada).
2. **Avaliações (dúvida #10): sem texto livre.** Ficam as estrelas 1–5 +
   elogios pré-prontos de um toque; o perfil mostra a média por papel e
   os elogios mais frequentes. Comentários (públicos ou para o admin)
   podem ser reavaliados pós-lançamento.
3. **Categorias iniciais (dúvida #9): lista aprovada** — Serviços
   domésticos (Faxina, Passadeira, Cozinha), Cuidados (Babá,
   Acompanhante de idosos, Pet), Eventos (Garçom, DJ, Fotógrafo,
   Montagem), Reparos e montagem (Montador de móveis, Pintura, Jardim),
   Mudanças e fretes (Carreto, Ajudante), Aulas (Reforço, Música,
   Idiomas), Beleza (Cabelo, Unhas, Maquiagem), Tecnologia (Instalações,
   Suporte) + "Outros" como guarda-chuva. Profissões regulamentadas
   (enfermagem, elétrica etc.) fora do MVP por responsabilidade legal —
   revisitar na revisão jurídica. Implementação: árvore no banco
   (parent_id + sort_order, migration 0028); anúncio escolhe o pai e,
   opcionalmente, o tipo ("Geral" = só o pai); a busca pelo pai inclui
   os filhos; o nome exibe "Pai › Filho".
4. **Marca (dúvida #12): "Vinc" é DEFINITIVO.** Rodada de design de logo
   (rodada 16) preparada em seguida para o David escolher.

## D-042 — Logo oficial: rodada 16b, opção A5 ("a pessoa no centro")
**Data:** 2026-07-09 · **Decidido por:** David

Da rodada 16 (conceitos A/B/C) o David escolheu o ESTILO A (duas linhas
que se encontram + ponto lilás do vínculo); da rodada 16b (variações
A1–A5) escolheu a **A5**: o V fecha num vértice único e o ponto sobe
para a abertura — quase uma pessoa de braços abertos. Leitura dupla:
a letra V e o vínculo com gente no centro.

Especificação: quadrado arredondado roxo `#6D28D9` (raio 18/72), traços
brancos de espessura 7 com pontas redondas (`M21 22 L36 52` e
`M51 22 L36 52` no viewBox 72), ponto lilás `#A78BFA` (r=7) em (36, 25).
Variante clara: caixa branca, traços roxos, ponto lilás.

Arquivos-fonte em `docs/design/logo/` (vinc-icon.svg, vinc-icon-light.svg,
vinc-mark.svg, vinc-assinatura.svg). Aplicação: componente `VincLogo`
(react-native-svg) nas telas de entrada e de conclusão de cadastro;
ícones do app regenerados (icon, android foreground/monochrome/
background, favicon, splash) a partir do SVG.

## D-043 — Gênero opcional no perfil e no cartão do candidato (dúvida #20)
**Data:** 2026-07-09 · **Decidido por:** David (resolvidas as duas sub-questões com os defaults recomendados pelo Claude)

O David citou gênero como informação relevante na escolha (D-024). Como
não havia edição de perfil, ficou pendente. Decisões:
1. **Opcional** — obrigar brigaria com a LGPD e com o cartão anonimizado;
   valores `female`/`male`/`other` (rótulos Mulher/Homem/Outro), mais
   "nenhum".
2. **Aparece por padrão, com controle para ocultar** — quando o gênero
   está preenchido, um switch "Mostrar meu gênero" (ligado por padrão)
   decide se ele vai para o cartão do candidato e para o perfil público.
   O consentimento é de quem exibe.

Implementação (migration 0029): colunas `gender` + `show_gender` em
profiles; nova tela **Editar perfil** (nome, bio, gênero + switch);
`get-candidates` só devolve o gênero quando `show_gender` (o cartão
segue sem worker_id/nome/foto — D-024 intacto); perfil público mostra o
gênero sob o nome quando exibido; helper puro `genderLabel` no domínio.
Verificado e2e (opt-in/opt-out ao vivo + anonimato preservado).

**Correção de segurança embutida:** o grant de UPDATE em `profiles` era
para a tabela inteira, permitindo a um usuário setar `is_admin = true`
na própria linha (escalonamento de privilégio). Agora o grant é por
COLUNA (name, avatar_url, bio, gender, show_gender) — testado: `PATCH`
com `is_admin` retorna 42501.

## D-044 — Remover o campo de gênero (revoga D-043)
**Data:** 2026-07-09 · **Decidido por:** David

O David reavaliou o gênero (introduzido opcional em D-043) e decidiu
**remover o campo por completo**. Racional (endossado pelo Claude):
- O **primeiro nome já sinaliza** o gênero na prática, então o campo
  explícito agrega pouca descoberta.
- **Evita desconforto** (pessoas trans/não-binárias, ou quem não quer
  declarar) e reduz a superfície de dado sensível/discriminação — mais
  coerente com o cartão anonimizado (D-024) e a LGPD.
- Casos legítimos de preferência se resolvem pela **descrição da vaga**
  e pelo **chat** após o match.

Mantidos: a tela **Editar perfil** (agora nome + bio) e a **correção de
segurança** do grant de UPDATE por coluna (name/avatar_url/bio) — o
escalonamento para `is_admin` segue fechado. Migration 0030 remove as
colunas `gender`/`show_gender`. Verificado: cartão do candidato sem
gênero, bio editável, `PATCH is_admin` → 42501.

## D-045 — Central de Ajuda layout C (híbrido) + a "Vi" com Claude Haiku e fallback local
**Data:** 2026-07-13 · **Decidido por:** David

Fechada a rodada 17: **Central de Ajuda no layout C (híbrido)** — a Vi em
destaque no topo (campo "Como posso ajudar?"), os cards de perguntas
frequentes abaixo, "Outros assuntos" e, no rodapé, "Falar com o suporte"
(humano). Bate exatamente com o pedido do David: a IA resolve o comum, o
humano só recebe o que sobra.

**Motor da Vi (§4 do docs/09 resolvido):** David deixou a critério do
Claude ("faça como recomendado por você"). Escolha: **Claude Haiku 4.5**
(`claude-haiku-4-5`) — melhor pt-BR entre as opções, **não treina** com os
dados (postura de dados adequada a uma central de suporte, que vê dados do
usuário — LGPD), custo de centavos por conversa. Descartados: **Gemini
free** (os termos do free tier **treinam** com os prompts → risco de
privacidade), **Groq/Llama** (não treina, mas pt-BR mais fraco).

**Porta de IA trocável** (espelha a `PaymentProvider`): `_shared/assistant.ts`
com dois adapters selecionados por env `ASSISTANT_PROVIDER`:
- `local` (**padrão**) — recuperação sobre `faq_articles` sem chamada
  externa; funciona sem chave e é o que roda até o David prover a chave.
- `claude` — adapter da Anthropic Messages API (`POST /v1/messages`,
  `x-api-key`, `anthropic-version: 2023-06-01`, modelo `claude-haiku-4-5`),
  ativado quando existir o secret **`ANTHROPIC_API_KEY`** de função.

⚠️ **Pendência (lembrete permanente, junto ao #21 do MP):** para a Vi rodar
com LLM de verdade, o David precisa criar uma **chave da API da Anthropic**
e enviá-la para virar o secret `ANTHROPIC_API_KEY`. Até lá, a Vi responde
pelo provedor `local` (recuperação da FAQ), que já resolve o comum.

## D-046 — Anti-abuso: bloqueio de contato reforçado, CPF único, suspensão e termos proibidos
**Data:** 2026-07-13 · **Decidido por:** David

David pediu defesas contra abuso (começando pelo exemplo de telefone/links
na vaga). O Claude propôs uma leva e o David aprovou **A+B+C+D**:

**A) Bloqueio de contato reforçado.** O `containsContactInfo` (D-040, que já
barrava telefone/e-mail/link no anúncio) agora também pega **número por
extenso** ("nove nove nove…"), **dígitos espaçados** ("9 9 9 9 9…"),
**handles sociais** (`@fulano`, "instagram/telegram: fulano", "arroba
fulano"). Passou a rodar também na **bio e no nome do perfil** (Edge
Function `update-profile`; o UPDATE direto de name/bio saiu do cliente —
migration 0035, só `avatar_url` fica direto). E um **aviso anti-golpe fixo
no chat** ("Combine e pague sempre pelo Vinc"). Textos legítimos (horários,
preços, quantidades) seguem passando — coberto por testes.

**B) CPF obrigatório e ÚNICO, à prova de recriação.** O CPF (já coletado no
onboarding — D-038) passa a ser **único por conta ativa** (índice único em
`payout_accounts.holder_cpf`) e ganha um **registro que sobrevive à exclusão
da conta** (`cpf_registry`, guardando só o **hash** do CPF + suspensão/ban).
Um trigger no cadastro do CPF: veta CPF banido, registra o hash e faz a
conta **herdar a suspensão vigente do CPF** — assim **deletar e recriar não
burla** a penalidade. CPF já usado por outra conta ativa → erro amigável
("este CPF já está em uso").

**C) Suspensão automática por reincidência.** `integrity_events` +
`profiles.suspended_until`. Limiares (validados pelo David, **a rever no
pré-lançamento** — checklist item 10): **3 cancelamentos de última hora**
(≤24h do início) em 30 dias **OU 2 denúncias procedentes** em 30 dias →
**7 dias** sem publicar nem se candidatar. Registrado por
`cancel-gig` (late_cancel) e pelo painel ao confirmar uma denúncia
(`support-panel-action` → upheld_report). A suspensão também vai para o
`cpf_registry` (via `apply_suspension`), fechando o ciclo com B. Prazos e
limiares centralizados em `packages/core/src/suspension.ts`.

**D) Termos proibidos na vaga.** `prohibitedContentCategory` (core) bloqueia
conteúdo claramente ilegal — **drogas, armas, sexual explícito** — na
criação/edição da vaga (`prohibited_content`). Lista **conservadora**
(palavra-inteira, sem acento) para não pegar anúncio legítimo ("programa de
reforma", "acompanhante de idoso" passam). Casos **ambíguos** (ex.:
discriminação) ficam para as **denúncias** (revisão humana no painel), não
para bloqueio automático.

**Fora desta leva** (registrado em docs/07 #10 e no checklist): anti
auto-negócio/Sybil (mais complexo), verificação por SMS no cadastro
(custo — junto do gateway) e OCR em imagens (pesado). Verificado e2e:
contato disfarçado, conteúdo proibido, CPF único (colisão → erro),
suspensão após 3 ofensas (publicar/candidatar → bloqueado) e herança da
suspensão numa conta nova com o mesmo CPF. Migrations 0034–0037.

## D-047 — Notificações push (fora do app)
**Data:** 2026-07-13 · **Decidido por:** David (roadmap: "começar pela 1")

Para um marketplace de "bicos" o tempo é crítico (ser escolhido, mensagem,
lembrete), então as notificações não podem viver só dentro do app. Desenho
escolhido, reaproveitando o que já existe:

- **Fonte única de eventos:** a central in-app (2.6) já grava uma linha em
  `notifications` por TRIGGER nos eventos (candidatura, status, liberação,
  disputa — inclusive pelos jobs pg_cron). Um trigger extra `dispatch_push`
  em `notifications` dispara (via **pg_net**, como o run-money-jobs) a Edge
  Function **`send-push`**, que entrega via **Expo Push API**. Assim ações
  de usuário E jobs notificam por push do mesmo jeito, sem duplicar lógica.
- **`send-push`** (verify_jwt off, protegida pelo mesmo `CRON_SECRET`):
  monta o texto pt-BR curto por `type`, busca os tokens do usuário, envia e
  **poda tokens mortos** (Expo `DeviceNotRegistered`).
- **App:** `expo-notifications` registra o token do aparelho em
  `push_tokens` (RLS: dono lê/apaga; "reivindicar" o token ao trocar de
  dono do aparelho); tocar na push abre `/service/:gigId`; some no logout.
- **Trocável/seguro por padrão:** sem `projectId` EAS (Expo Go/sem build) o
  app **não emite token** e tudo segue funcionando (só sem push) — a
  entrega real no aparelho depende do **build EAS** (checklist item 11).

Verificado e2e: registro de token, trigger → pg_net → `send-push` (resposta
200 no `net._http_response`), envio ao Expo com poda do token inválido,
gate do secret (403 sem ele) e RLS (terceiro não lê tokens alheios).
Migration 0038; função `send-push`; `@vinc/api` push.ts.

## D-048 — Primeiro uso: opção B (ação em primeiro lugar)
**Data:** 2026-07-13 · **Decidido por:** David

Rodada 18 (`docs/design/rodada-18-onboarding.html`): David escolheu a
**opção B**. Após a conta ficar completa (logado + chave Pix), o app mostra
**uma vez** a tela `/welcome`: "Oi, {nome}! O que você quer fazer agora?"
com dois cartões grandes que levam **direto à ação** — "Preciso de uma
ajuda" (→ Anunciar, "publicar é grátis") e "Quero fazer bicos" (→ Buscar,
"receba pelo app") — mais "Depois eu vejo". Zero leitura obrigatória,
coerente com o público de baixa escolaridade (poucos cliques, ação óbvia).

Implementação: `WelcomeGate` (só dispara com a conta completa, para não
competir com o gate de chave Pix — D-038), flag "visto" por usuário no
aparelho (AsyncStorage). Descartadas: A (carrossel de 3 telas — passivo,
adia a ação) e C (onboarding embutido — depende de a pessoa ler a dica).

## D-049 — Correção de bugs do 1º teste do David + causa-raiz "modo demo" no build
**Data:** 2026-07-13 · **Decidido por:** David (reporte) + Claude (diagnóstico)

David reportou 9 bugs no 1º teste. Diagnóstico (cada um reproduzido):

**6 dos 9 eram artefatos do MODO DEMONSTRAÇÃO** (bugs 4,5,6,7,8,9): o app
rodava sem conexão ao Supabase, então as telas usavam mocks (lista de 3
candidatos fixa, escolher/recusar/avaliar/editar/bloquear "fingem sucesso").
Provado por e2e que o **backend real está correto**: escolher trava a vaga
(2º choose recusado), recusar funciona abaixo de 3, editar vaga aceita →
`not_editable`, avaliação é única (2ª → 409) e aparece no perfil, bloqueio
alterna certo. **Causa-raiz:** o `.env` é gitignored → o **EAS Build não o
inclui** → o APK subia sem `EXPO_PUBLIC_SUPABASE_*` → modo demo. **Correção:**
as credenciais **públicas** (URL + chave publishable) entram no `eas.json`
(`env` por perfil), e um **banner de "Modo demonstração"** passa a avisar
quando não há conexão — nunca mais silencioso.

**3 eram bugs reais, corrigidos:**
- **Bug 1 (horários passados):** o formulário agora **oculta horas que já
  passaram** quando o dia é hoje (e desabilita "Hoje" se não há mais horas);
  o backend já rejeitava `starts_in_past`.
- **Bug 2 (local fora do Brasil/oceano):** o mapa só confirma um ponto que o
  reverse-geocode resolve **dentro do Brasil** (oceano/fora → bloqueado com
  aviso); e o backend passa a validar um **bounding box do Brasil**
  (`validateGigDraft` → `location_outside_brazil`, verificado e2e). **Regra
  de produto:** por ora só locais dentro do Brasil.
- **Bug 3 (busca de endereço não fazia nada):** a busca no mapa agora roda
  **enquanto se digita** (debounce, ≥3 letras) em vez de só no "enter", e
  manda o `User-Agent` exigido pelo Nominatim.

Rebuild do APK (`eas build`) elimina os 6 bugs de modo demo; os 3 reais já
estão no código. Testes do core + typecheck + lint verdes.

## D-050 — Manter o modo demonstração, mas usar sempre o modo real nos testes
**Data:** 2026-07-13 · **Decidido por:** David

O modo demonstração (app sem `EXPO_PUBLIC_SUPABASE_*` → dados fictícios,
identificado pela faixa laranja de D-049) **fica no código** — é útil para
pré-visualizar telas sem backend. Mas, como ainda **não há clientes reais**,
todos os testes do David rodam **no modo real** (conectado ao Supabase). Como
o `eas.json` já injeta as credenciais públicas por perfil (D-049), qualquer
build de `preview`/`production` sobe conectado ao backend real e, portanto,
exige login antes de qualquer ação — o modo demo só aparece em execução sem
env (ex.: dev local sem `.env`), sinalizado pela faixa.

## D-051 — App usa só o primeiro nome
**Data:** 2026-07-13 · **Decidido por:** David

Em todo o app, as pessoas são identificadas apenas pelo **primeiro nome**
("David" se candidatando à vaga de "Ana", em vez de "David Buckley"/"Ana
Abuso"). O cadastro pede só o primeiro nome; para contas antigas, o app
também corta no primeiro token ao exibir (`firstName()` no core, idempotente,
aplicado na fronteira da API). Mais simples e informal, alinhado à referência
de UX (iFood/Uber) e à regra de baixa fricção do produto (docs/01).

## D-052 — Perfil com nota geral única + denúncia de avaliação e de vaga com motivos
**Data:** 2026-07-13 · **Decidido por:** David

**(a) Nota geral única.** O perfil deixa de mostrar blocos separados "COMO
PRESTADOR"/"COMO ANUNCIANTE" e passa a mostrar **uma nota geral** (média de
prestador + anunciante, já disponível na view `profile_stats.avg_rating`) mais
os **totais**: avaliações, serviços prestados e vagas anunciadas. As
avaliações listadas passam a ser as de **ambos os papéis**. Observação: a
separação por papel havia sido criada contra manipulação (D-010/D-011); a
média geral continua computada sobre as mesmas avaliações reais, então não
abre brecha — só simplifica a leitura.

**(b) Denúncia com motivos.** A denúncia (de vaga e de avaliação) passa a
abrir uma folha com **lista de motivos** + **texto complementar** opcional,
em vez do "toque duas vezes". Componente único `ReportSheet`, gravando em
`reports.category` (motivo) e `reports.reason` (texto). A tabela genérica
`reports` ganhou o alvo `review` (migração 0039). Denunciar uma avaliação
injusta/ofensiva vira um item de moderação como os demais.

## D-053 — Seletor de dia/hora na criação de vaga (Hoje/Amanhã/calendário + 24h)
**Data:** 2026-07-14 · **Decidido por:** David

Substitui os chips de dia ("qui 16, sex 17…") e o slider fixo de 6h–23h por:
- **Dia:** botões **Hoje** e **Amanhã** + **📅 Outro dia** (abre um calendário
  mensal puro em JS, sem dependência nativa; dias passados desabilitados).
- **Hora:** dois campos ("Começa"/"Termina") que abrem um seletor de horas
  cobrindo **as 24h** (madrugada inclusa); o término pode ir até 24h (=00:00
  do dia seguinte), permitindo serviços que viram a noite.

Correções embutidas (bugs do 2º teste do David): **(a)** horas que já
passaram no dia de hoje não aparecem; **(b)** o dia é guardado como uma
**data absoluta** (não um índice numa lista congelada) e o "agora" é lido a
cada render, então a **virada de meia-noite** não cria mais vaga no dia que
passou; **(c)** suporte a qualquer hora do dia. Componentes reutilizáveis
`MonthCalendar` e `HourPicker`. A validação de `starts_in_past` (core +
backend) segue como rede de segurança final.

## D-054 — Agenda: bloco único por compromisso + dia completo (0h–23h)
**Data:** 2026-07-14 · **Decidido por:** David

Na agenda do dia, um serviço/vaga que ocupa mais de 1h passa a ser **um bloco
único** (altura proporcional à duração) em vez de vários quadrados "ocupado"
repetidos. A grade também passa a cobrir **as 24h** (0h–23h), para caber
serviços de madrugada (D-053). A montagem das linhas é uma função pura
(`buildDaySegments`) fora do render.

## D-055 — Mapa da vaga navegável (tela cheia) com o raio/pino ancorado
**Data:** 2026-07-14 · **Decidido por:** David

Tocar no local de uma vaga abre agora um **mapa em tela cheia navegável**
(pan/zoom), em vez de uma prévia estática. O **raio** (local aproximado) ou o
**pino** (local exato, para quem já foi escolhido) é desenhado **dentro do
mapa**, ancorado à coordenada — fica sobre o lugar mesmo enquanto o usuário
arrasta o mapa. Assim quem não conhece a região consegue se situar antes de
se candidatar, **sem revelar o endereço exato** (privacidade, D-028): no modo
aproximado só aparece o círculo de ~600 m. `LocationMap` ganhou as props
`circleMeters` e `marker` (nativo via WebView/MapLibre e web).

## D-063 — Agenda: candidaturas sobrepostas em colunas (Opção C)
**Data:** 2026-07-14 · **Decidido por:** David (mock rodada 20, opção C)

Quando várias candidaturas/compromissos caem no mesmo horário (B-26), a agenda
mostra **todas**, em **colunas lado a lado** ao estilo Google Agenda — cada
compromisso vira uma coluna e a altura reflete a duração. Antes, a agenda
mostrava só o primeiro (`buildDaySegments` usava `.find()` por hora).
Implementação: os compromissos que se sobrepõem são agrupados num *cluster* e
distribuídos em colunas (coloração de intervalos — cada um na primeira coluna
livre); um compromisso sem sobreposição continua ocupando a largura toda.
Candidatura = cartão tracejado; vaga/trabalho confirmado = cartão roxo.
Opções A (encaixado) e B (cartão agrupado) descartadas — o David preferiu ver
a duração de cada um lado a lado.

## D-062 — Busca com filtros (Opção A) + região dinâmica por GPS
**Data:** 2026-07-14 · **Decidido por:** David (mock rodada 19, opção A)

A busca ganha filtros no modelo **chips na tela** (Opção A do mock): Quando ·
Hora · Distância · Região. Implementado por partes:
- **Distância (B-07):** raios 5/10/30/50/100 km (já existiam no seletor de
  região; ficam acessíveis pela barra de região).
- **Região por nome (B-08):** campo de busca de bairro/cidade com **sugestões
  dinâmicas enviesadas pela localização atual** (`searchRegions` com viewbox
  ~75 km ao redor do GPS) — **nada hard-coded**: "centro" perto de Aracaju
  devolve o centro de Aracaju; perto do Rio, o do Rio (verificado). Sem
  bias, é busca Brasil inteiro.
- **Hora (B-06):** já cobre 24h; o seletor de hora só aparece quando a busca
  é de um único dia (uma faixa de vários dias cobre cada dia inteiro).
- **Faixa de datas (B-05):** chips "Qualquer dia · Hoje · Amanhã · 📅 Escolher
  datas"; o `DateRangeCalendar` seleciona início+fim (2× no mesmo dia = só ele).
  O `slot` vira a janela [início 00:00, fim+1 00:00], que casa com a busca por
  sobreposição já existente no back — sem migração de banco.

## D-061 — Novo usuário começa com nota 5 + selo; "ver todas as vagas"
**Data:** 2026-07-14 · **Decidido por:** David

- **Novo usuário = nota 5 (B-29):** quem ainda não recebeu avaliações aparece
  com **★ 5,0** (benefício da dúvida, em vez de "sem nota", que parecia ruim),
  sempre com o selo **"🌱 Novo usuário"** — no card do candidato (para quem
  escolhe) e no perfil. A média real substitui o 5 assim que houver avaliações.
- **Ver todas as vagas (B-03):** a busca ganha um botão "Ver todas as vagas"
  que lista as vagas de **todas as categorias** juntas (além dos blocos por
  categoria).

## D-060 — Coerência da denúncia e da edição de vaga
**Data:** 2026-07-14 · **Decidido por:** David

- **Vaga denunciada some da lista e não aceita candidatura (B-23):** o usuário
  passa a poder ler as próprias denúncias (nova policy RLS em `reports`,
  migração 0040). A vaga que denunciei é filtrada das "vagas abertas", o botão
  de candidatar fica bloqueado e não dá para denunciar de novo — tudo persistido
  (não é só no estado da tela).
- **Denunciar não é fuga de responsabilidade (B-24):** ao denunciar uma vaga
  em que eu era candidato **pendente**, minha candidatura é retirada (eu não
  quero mais a vaga). Mas se eu já fui **escolhido**, a denúncia **não cancela**
  o compromisso — vai para a moderação; sair sem multa continua sendo só pela
  regra de cancelamento (D-027).
- **Não editar vaga com candidatos (B-25):** o `update-gig` recusa
  (`has_candidates`) alterar horário/local quando há candidaturas ativas
  (pendentes ou escolhido). Só dá para editar uma vaga aberta **sem** ninguém
  candidatado (ou com todos recusados). Assim ninguém muda as regras debaixo
  dos candidatos. **Reforço no banco:** trigger `block_edit_with_candidates`
  (migração 0041) bloqueia a alteração dos campos de conteúdo mesmo se o edge
  function não estiver atualizado — **verificado e2e** (editar `starts_at` de
  uma vaga com candidato → recusado, linha intacta). O edge function
  `update-gig` (que dá a mensagem específica "já há gente candidatada…") foi
  **deployado pela Management API** (o CLI não funciona no sandbox por
  Docker/proxy; o `deploy-fn.sh` multipart resolve). Deploy + trigger juntos.

## D-059 — Localização: abre na região do usuário, rejeita o mar, busca melhor
**Data:** 2026-07-14 · **Decidido por:** David

Correções no seletor de local (B-10/B-11/B-12/B-13):
- **Abre na região do usuário** (GPS) em vez do meio do Brasil (B-10).
- **Rejeita o mar e locais fora do Brasil** de forma correta (B-11): o reverse
  geocode agora distingue *endereço* × *sem endereço (mar)* × *erro de rede*
  (`reverseGeocodeDetailed`). O bounding box do Brasil sozinho aceitava água
  costeira; agora, "sem endereço" (mar) e país ≠ Brasil bloqueiam a confirmação,
  enquanto um erro de rede cai de volta no bbox (nunca bloqueia um pino válido).
  Verificado: um ponto no Atlântico dentro do bbox retorna "sem endereço".
- **Busca** dispara ao digitar **e ao enviar** (Enter), com estado "nenhum
  endereço encontrado" (B-10). *Ressalva:* o Nominatim público proíbe
  autocomplete e limita a 1 req/s — a busca fica confiável de verdade só com o
  provedor de geocodificação de produção (já no roadmap, docs/11 B-10).
- **Botão do local** já mostrava o endereço e "mudar" (B-12) e o **card de
  prévia** já mostra bairro/cidade (B-13) — ambos passam a funcionar de fato
  agora que o reverse devolve um endereço real.

## D-058 — Serviço pode virar o dia, mas com jornada máxima de 8h
**Data:** 2026-07-14 · **Decidido por:** David

Uma vaga pode terminar na **madrugada do dia seguinte** (ex.: babá 22h→03h),
escolhendo o horário de término que passa da meia-noite — sem precisar abrir
duas vagas (B-16). Ao mesmo tempo, a **duração máxima é 8h**
(`GIG_MAX_DURATION_HOURS`), por motivo de jornada de trabalho. Implementado no
seletor de hora (fim vai de +1h a +8h, marcando "(+1 dia)") e validado no core
(`validateGigDraft` → `duration_too_long`, com testes), logo o backend
(`create-gig`) também recusa. O redirecionamento pós-publicação (B-14) e o
reset do formulário ao reabrir a aba (B-15) entram no mesmo lote.

## D-057 — Teto de valor por vaga (provisório R$ 10.000)
**Data:** 2026-07-14 · **Decidido por:** Claude (provisório — confirmar com David)

Vagas passam a ter um **valor máximo** (`GIG_MAX_PRICE_CENTS`, hoje
R$ 10.000,00) além do mínimo de R$ 10 (D-019). Motivos: evitar valores
absurdos (ex.: 8h por R$ 50.000) e dar **mensagem específica** ("O valor
máximo de uma vaga é R$ 10.000,00") em vez do erro genérico que aparecia com
entradas gigantes (ex.: 10 milhões) — bugs B-18/B-19. Validado no core (com
teste) e, por tabela, no backend (mesma `validateGigDraft`). **O número exato
do teto precisa ser confirmado pelo David** (talvez menor, ou por categoria).

## D-056 — Primeiro uso: rótulo mais claro + fim do loop do "Depois eu vejo"
**Data:** 2026-07-14 · **Decidido por:** David (reporte) + Claude

Dois ajustes na tela de boas-vindas (D-048):
- **Rótulo:** "Preciso de uma ajuda" (que parecia botão de suporte/FAQ) vira
  **"Quero contratar um serviço"**; a outra opção fica "Quero fazer bicos e
  ganhar dinheiro". Deixa claro que é a área de anunciar/buscar, não suporte.
- **Bug de navegação:** ao tocar "Depois eu vejo" (ou qualquer opção) o app
  voltava para a mesma tela e prendia o usuário até reiniciar. Causa: o
  `WelcomeGate` relia um estado `seen` que ficava desatualizado depois de
  `markWelcomeSeen`, e reencaminhava para `/welcome` em loop. Correção: o gate
  agora só redireciona **uma vez por sessão** (ref-guard); o flag persistido
  cuida das próximas aberturas.
