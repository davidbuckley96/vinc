# 02 — Especificação do Produto

> Regras de negócio e fluxos. Itens marcados com ⚠️ têm pendências em
> `07-duvidas-abertas.md`. Decisões já tomadas estão em `06-decisoes.md`.

## 1. Usuários e papéis

- **Conta única com dois papéis** (decisão D-004): qualquer usuário pode, com a
  mesma conta, **anunciar vagas** (papel *anunciante*) e **aceitar serviços**
  (papel *prestador*). Não há cadastro separado por papel.
- A **reputação é unificada por pessoa**, mas exibida com contexto: avaliações
  recebidas como anunciante e como prestador, total de serviços concluídos
  (prestados e ofertados).

### Perfil público exibe
- Nome e foto.
- Nota média (1–5) e quantidade de avaliações, como prestador e como anunciante.
- Total de serviços concluídos (prestados / ofertados).
- Categorias em que atua.

## 2. Vaga (anúncio de serviço)

Campos essenciais:

| Campo | Exemplo |
|---|---|
| Categoria | Serviços domésticos › Babá |
| Título curto | "Babá para 2 crianças" |
| Descrição do serviço esperado | Texto livre, com o que deve ser feito |
| Data e horário | dia X, 15h–22h |
| Valor do serviço (BRL) | R$ 160,00 — **mínimo R$ 10** (D-019, contra anúncios maliciosos quase-grátis) |
| Local | Escolhido **no mapa** (ver §2.1) — nível de detalhe exibido antes do aceite ⚠️ em aberto |

### 2.1 Localização por mapa (definido pelo David em 2026-07-03; implementada — D-023)

- **Na criação do anúncio**, o local NÃO é uma caixa de texto livre (evita
  endereços inexistentes/ambíguos). A pessoa escolhe no **mapa**, estilo
  Uber/iFood: arrastando o pino OU digitando na caixa de busca dentro do
  próprio mapa (geocodificação).
- **Na visualização da vaga** (antes e depois do aceite), o endereço é
  clicável e abre um **modal com o mapa** mostrando o pino do local, com um
  botão de fechar.
- Implementação (rodada 7, opção A — D-023): mapa em tela cheia com pino
  fixo no centro (o mapa move por baixo, estilo Uber), busca no topo,
  endereço lido na hora (Nominatim) e botão "Confirmar este local".
  Colunas `lat`/`lng` em `gigs` (migration 0011), validadas no domínio e
  nas functions. Vagas antigas sem pino mostram o endereço como texto.
- Provedor: MapLibre GL (web: nativo; app: WebView no MVP) + tiles
  OpenFreeMap (sem chave; trocar por MapTiler com chave própria no
  pré-lançamento) + Nominatim para busca/leitura de endereço.

Categorias iniciais: saúde, entretenimento, serviços domésticos (lista completa
⚠️ em aberto — expansível, cadastrada no banco e não no código).

### Ciclo de vida da vaga

```
ABERTA → CANDIDATURA PENDENTE → ACEITA → EM ANDAMENTO
   ▲              │                │           │
   │   (anunciante recusa;        │           └→ AGUARDANDO CONFIRMAÇÃO → CONCLUÍDA
   └── candidato fica bloqueado   ├─ cancelada pelo anunciante (multa)
       para ESTA vaga)            └─ cancelada pelo prestador (punição de reputação)

ABERTA → excluída antes de candidatura/aceite (sem punição) · expirada
```

**Expiração (D-022):** vaga que chega ao horário de INÍCIO sem ninguém
aprovado expira sozinha (job a cada 5 min) e o valor do prestador é
reembolsado — a taxa fica com a empresa. A busca nunca mostra vagas já
iniciadas e a candidatura a elas é recusada.

### 2.2 Editar e excluir a própria vaga (D-017 — implementado)

- **Excluir**: permitido enquanto ninguém foi aprovado (vaga aberta ou com
  candidato pendente). O **valor do prestador volta** para o anunciante; a
  **taxa fica** com a empresa (§5.1). Após aprovar alguém vira
  cancelamento, com multa (⚠️ dúvida #1). Botão com confirmação em dois
  toques na tela da vaga.
- **Editar**: permitido apenas com a vaga **aberta e sem candidato
  pendente** (o candidato se candidatou a termos específicos — decida
  primeiro). Editáveis: categoria, título, descrição, dia/horário e local.
- **O valor NÃO é editável** (nem para cima nem para baixo): ele está
  amarrado ao pagamento feito na criação (escrow + taxa). Para pagar outro
  valor: excluir a vaga (reembolso do líquido) e criar outra. Confirmação
  do David ⚠️ dúvida #18.
- Técnica: edição e exclusão passam por Edge Functions (`update-gig`,
  `delete-gig`); a política de UPDATE direto do cliente foi removida
  (migration 0007) para o valor não ser alterável fora do fluxo.

## 3. Candidatura e escolha do prestador (D-024, substitui o modelo D-012)

- O prestador **se candidata** a uma vaga ABERTA com poucos cliques. A vaga
  **continua aberta e visível na busca**, juntando candidatos, até o
  anunciante escolher alguém (ou a vaga expirar no horário de início).
- **Candidatar-se NÃO trava a agenda** do prestador: ele pode se candidatar
  a várias vagas, inclusive de horários conflitantes — só a ESCOLHA ocupa o
  horário. A escolha re-checa o conflito de agenda do candidato e
  auto-recusa quem ficou ocupado enquanto esperava.
- **O anunciante escolhe UM candidato** na tela da vaga, vendo apenas dados
  **anonimizados** (LGPD/antidiscriminação — D-024): primeiro nome, nota
  como prestador, nº de avaliações, total de serviços prestados e os
  elogios pré-prontos mais frequentes. Sem foto, sem nome completo, sem
  idade, sem link para o perfil real (o id que trafega é o da candidatura,
  aleatório e por vaga). Após a escolha, o perfil completo fica visível
  como em qualquer serviço vinculado.
- **Recusa individual (sem multa):** o candidato recusado **nunca mais vê
  nem pode se candidatar a ESTA vaga**; pode se candidatar normalmente a
  outras vagas do mesmo anunciante — salvo bloqueio (§8). Os demais
  candidatos de uma vaga que escolheu alguém ficam apenas "não escolhidos",
  sem punição.
- **Escolha:** vira o vínculo (ACEITA). O pagamento já foi feito na criação
  da vaga (§5.1 — D-013): o líquido segue retido em escrow até a conclusão.
- Notificações de candidatura/escolha: aviso dentro do app no MVP; push na
  Fase 2.

### Punições pós-aprovação
- **Anunciante** cancela após aprovar (serviço aceito ou em andamento) →
  paga **multa de 25% do valor do prestador, com piso de R$ 10** (D-018).
  É **uma única operação por pessoa** (D-020): o anunciante recebe **um
  reembolso já com a multa deduzida** (vaga de R$ 100 → voltam R$ 75; a
  taxa da criação fica com a empresa) e o **prestador lesado é pago
  diretamente** na sua parte — internamente **80% da multa** vai para ele
  e **20% para a plataforma**. Na interface, a multa é apresentada pelo
  valor total, "como compensação pelo prestador lesado" — a divisão 80/20
  é interna (D-019). Excluir a vaga deixa de ser possível após a
  aprovação — só existe o cancelamento com multa. Recusar uma candidatura
  NÃO gera multa.
- **Prestador** cancela após a aprovação → sem multa financeira na fase
  inicial, mas sofre punição de reputação/prioridade (modelo Uber). ⚠️.

## 4. Execução e conclusão do serviço

- No horário marcado, o serviço entra **EM ANDAMENTO** (mecânica de check-in ⚠️).
- Ao final, o prestador marca como concluído e o **anunciante confirma** que o
  serviço foi realizado corretamente — essa confirmação libera o pagamento.
- Proteção contra anunciante que não confirma de má-fé: liberação automática
  após prazo se não houver contestação (prazo ⚠️ em aberto).
- Proteção contra serviço malfeito (ex.: faxina pela metade): o anunciante pode
  **contestar antes da liberação**, abrindo uma disputa (ver §6).

## 5. Pagamentos (MVP: simulado — decisões D-003 e D-013)

- No MVP toda a mecânica financeira funciona com **saldo simulado** (carteira
  interna), sem gateway real. A arquitetura já modela o fluxo real:
  1. **Na criação da vaga o anunciante paga o valor total** (bruto), composto
     de: **taxa de serviço da plataforma** (não reembolsável) + **valor
     líquido** que fica retido em escrow para o prestador.
  2. Serviço concluído e confirmado → o valor do prestador entra na carteira
     dele **em processamento** (ver §5.2) e, vencido o prazo de liberação,
     vira **saldo disponível**.
  3. Prestador **saca** o saldo disponível para conta bancária (no MVP:
     saque simulado; no futuro: Pix via gateway — Fase 3) ou o usa para
     **criar vagas**.

### 5.1 Taxa de serviço na criação (D-013, ajustada por D-014)

- **O anunciante escolhe o valor que o PRESTADOR RECEBERÁ (x)** e a taxa de
  serviço é somada por cima: ao confirmar a vaga ele paga **x + taxa**.
  Exemplo (valores ilustrativos, percentual final ⚠️ em aberto): prestador
  recebe R$ 100 → taxa de R$ 10 → o anunciante paga R$ 110.
- **O prestador sempre vê o valor escolhido (x)** (na busca, no detalhe, na
  agenda, na carteira): ele recebe integralmente o valor pelo qual se
  candidatou. A **prévia** do anúncio na criação mostra esse valor.
- A **taxa aparece explícita no momento da criação** ("O prestador recebe
  R$ 100 · Taxa de serviço + R$ 10 · Você paga R$ 110").
- **Reembolso:** se ninguém se candidatar, se o anunciante recusar todos os
  candidatos ou se ele excluir a vaga antes de aprovar alguém, o **valor do
  prestador é reembolsado** (R$ 100 no exemplo) — **a taxa fica com a
  empresa**. Isso
  impede o golpe de "recusar indefinidamente esperando reembolso total":
  arrepender-se de abrir a vaga custa a taxa.
- Multas são cobradas do saldo/forma de pagamento do anunciante infrator.
- Todo movimento financeiro gera **registro imutável em ledger** (auditoria).

### 5.2 Carteira (D-015/D-021 — implementada; design: rodada 6, opção C)

Duas abas ("Disponível" / "Em processamento"), saldo único em destaque,
saque fixo embaixo e extrato na tela "Histórico". Regras:

- A carteira destaca **um único saldo: o disponível para saque** — o total
  recebido desde o último saque. Serviços **ainda não prestados não
  aparecem** na carteira (compromissos futuros vivem na agenda).
- Serviço concluído entra na carteira **imediatamente**, mas numa seção
  separada, **"Em processamento"**: por **7 dias** (valor inicial — D-016)
  o valor não pode ser sacado. Esse prazo existe para dar tempo de o
  anunciante abrir um **pedido de reembolso** por serviço malfeito, que
  passa por análise e é **aceito ou negado** (processo de disputas, §6).
- Vencido o prazo sem contestação (ou com a contestação negada), o valor
  migra automaticamente para o **saldo disponível**.
- O saldo disponível pode ser:
  - **sacado para a conta bancária do usuário** — via **Pix** no
    lançamento; demais opções (cartões, carteiras digitais como Mercado
    Pago/PicPay) seguem a direção de D-016 e a escolha do gateway (⚠️
    dúvida #17);
  - **usado, integral ou parcialmente, para criar vagas**: a opção aparece
    **na hora do pagamento do anúncio** (quadro da taxa), não como botão na
    carteira (D-021). No MVP simulado o saldo é a própria forma de
    pagamento; a escolha saldo × outro meio chega com o gateway (Fase 3).
- O **extrato completo** (todos os pagamentos e recebimentos) sai da tela
  principal e fica atrás de um botão **"Ver histórico"**.

## 6. Denúncias, disputas e reembolsos ⚠️ (parte mais complexa — em aberto)

Direção já definida pelo David:

- Usuário lesado pode **denunciar** e **pedir reembolso**; o caso passa por um
  **processo de análise** com aprovação ou negação (modelo Uber).
- A plataforma **não dá descontos/créditos em dinheiro** para compensar danos
  na fase inicial — compensações são não-financeiras (ex.: prioridade).
- O processo precisa proteger os usuários **e** a plataforma contra fraude.

A desenhar: quem analisa (admin humano no início?), evidências (fotos?),
prazos, consequências de denúncias procedentes/improcedentes, limites de
reembolso. Ver `07-duvidas-abertas.md`.

## 7. Avaliações

- Ao concluir um serviço, **ambas as partes se avaliam** com nota 1–5
  (comentário opcional ⚠️).
- A avaliação compõe a média pública do usuário e seu histórico por categoria.
- O sistema deve ser **rigoroso**: nota 5 é o padrão de excelência a perseguir;
  usuários mal avaliados naturalmente recebem menos aceites/anúncios.
- Mecanismos anti-manipulação (avaliação só após serviço concluído; uma
  avaliação por serviço).

## 8. Bloqueio entre usuários (definido pelo David em 2026-07-03)

- Qualquer usuário pode **bloquear** outro (ex.: pelo perfil público).
- Efeitos do bloqueio (valem nas duas direções, para quem bloqueou e para
  quem foi bloqueado):
  - As **vagas anunciadas por um não aparecem** para o outro.
  - Nenhum dos dois pode **se candidatar** a vagas do outro.
  - A **comunicação entre eles fica bloqueada** (quando existirem mensagens
    dentro do app — previstas para o MVP).
- O bloqueio é a ferramenta para cortar relação com um usuário específico;
  a recusa de candidatura (§3) afeta apenas uma vaga específica.
- Desbloqueio: quem bloqueou pode desfazer.

## 9. Mensagens entre as partes (Fase 1 — backend pronto, UI na rodada 9)

- **Uma conversa por serviço**, entre o anunciante e o prestador
  **escolhido** — nunca durante a fase anônima de candidatura (D-024).
- Disponível do momento da escolha até depois da conclusão (combinar
  chegada, avisar atraso, resolver pendências).
- **Bloqueio corta o envio nos dois sentidos** (§8); mensagens antigas
  continuam legíveis (registro).
- Mensagens **imutáveis** (sem editar/apagar — proteção em disputas, §6) e
  entregues **em tempo real**; só os dois participantes conseguem ler
  (RLS; verificado e2e, incluindo falsificação de remetente).

## 10. Home / Calendário (tela principal)

- Calendário com visões **diária (dividida por hora), semanal e mensal**.
- O usuário seleciona um horário e escolhe entre:
  - **Buscar serviços abertos** naquele horário (papel prestador), ou
  - **Criar um anúncio** para aquele horário (papel anunciante).
- A agenda mostra os compromissos do usuário: serviços aceitos (como prestador)
  e vagas anunciadas (como anunciante).
- Fluxo central do produto: "tenho o dia X livre → preencho com um bico".

## 11. Requisitos não-funcionais

- **Plataformas:** Android, iOS e web (desktop e mobile) com um só código.
- **Acessibilidade/simplicidade:** usável por pessoas de baixa escolaridade;
  poucos cliques por fluxo; textos curtos e diretos em pt-BR.
- **Escalabilidade do código:** baixo acoplamento, features isoladas, lógica de
  domínio reutilizável (ver `03-arquitetura.md`).
- **Segurança:** RLS no banco, regras financeiras somente no backend (nunca
  confiar no cliente), ledger auditável.

## 12. Escopo do MVP (Fase 1 do roadmap)

**Dentro:** auth + perfil, calendário home (3 visões), criar/editar/excluir
vaga, listar/buscar vagas por horário e categoria, aceite atômico com checagem
de conflito, ciclo de vida completo do serviço, confirmação de conclusão,
carteira simulada com escrow e multa, avaliações mútuas, perfil público com
reputação.

**Fora (fases seguintes):** pagamentos reais/Pix, denúncias e disputas, chat,
notificações push, geolocalização/mapa, KYC, painel administrativo.
