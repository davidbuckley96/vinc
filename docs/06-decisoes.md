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
