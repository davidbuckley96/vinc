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
