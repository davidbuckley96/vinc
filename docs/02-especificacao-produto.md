# 02 — Especificação do Produto

> Regras de negócio e fluxos. Itens marcados com ⚠️ têm pendências em
> `07-duvidas-abertas.md`. Decisões já tomadas estão em `06-decisoes.md`.

## 1. Usuários e papéis

- **Conta única com dois papéis** (decisão D-004): qualquer usuário pode, com a
  mesma conta, **anunciar vagas** (papel *anunciante*) e **aceitar serviços**
  (papel *prestador*). Não há cadastro separado por papel.
- **Criar a conta exige CPF + chave Pix de recebimento** (D-038): o
  formulário pede o CPF com a caixa "usar meu CPF como chave Pix" marcada
  por padrão; desmarcando, a pessoa informa outra chave válida (celular,
  e-mail ou aleatória). Quem entra **com Google** (ou uma conta antiga sem
  chave) passa por um **passo obrigatório de conclusão** no primeiro
  acesso. A chave pode ser trocada depois (perfil → "Receber pagamentos").
  Objetivo: nunca existir usuário sem como sacar.
- A **reputação é unificada por pessoa**, mas exibida com contexto: avaliações
  recebidas como anunciante e como prestador, total de serviços concluídos
  (prestados e ofertados).

### Perfil público exibe
- Nome e foto.
- Nota média (1–5) e quantidade de avaliações, como prestador e como anunciante.
- Total de serviços concluídos (prestados / ofertados).
- Categorias em que atua.

> Gênero NÃO é coletado (D-044): o primeiro nome já sinaliza, e evitar o
> campo reduz desconforto e discriminação; preferências específicas vão
> na descrição da vaga e no chat após a escolha.

## 2. Vaga (anúncio de serviço)

Campos essenciais:

| Campo | Exemplo |
|---|---|
| Categoria | Serviços domésticos › Babá |
| Título curto | "Babá para 2 crianças" |
| Descrição do serviço esperado | Texto livre, com o que deve ser feito |
| Data e horário | dia X, 15h–22h |
| Valor do serviço (BRL) | R$ 160,00 — **mínimo R$ 10** (D-019, contra anúncios maliciosos quase-grátis) |
| Local | Escolhido **no mapa** (ver §2.1) — antes da escolha só bairro/região + pino aproximado; completo para o escolhido (D-028) |

### 2.1 Localização por mapa (definido pelo David em 2026-07-03; implementada — D-023)

- **Na criação do anúncio**, o local NÃO é uma caixa de texto livre (evita
  endereços inexistentes/ambíguos). A pessoa escolhe no **mapa**, estilo
  Uber/iFood: arrastando o pino OU digitando na caixa de busca dentro do
  próprio mapa (geocodificação).
- **Na visualização da vaga**, o local é clicável e abre um **modal com o
  mapa**, com um botão de fechar. O que aparece depende de quem olha
  (D-028, implementado no bloco 2.3):
  - **Antes da escolha** (busca e detalhe da vaga aberta): só o rótulo da
    região ("Boa Vista, Recife") e um **círculo aproximado** no mapa — o
    pino público é deslocado aleatoriamente 250–600 m **uma única vez na
    criação** (recalcular a cada acesso permitiria descobrir o ponto real
    por média). Aviso fixo: "O endereço exato aparece quando você é
    escolhido."
  - **Depois da escolha**: o prestador escolhido e o anunciante veem o
    endereço completo e o pino exato.
  - **Garantia no banco, não na interface**: o endereço exato fica na
    tabela `gig_addresses` (migration 0017), legível por RLS apenas pelo
    anunciante e pelo prestador designado; `gigs` guarda só `area`,
    `approx_lat` e `approx_lng`. O rótulo da região é derivado do formato
    do geocodificador ("Rua X, 120 — Bairro, Cidade" → parte após o "—").
- Implementação (rodada 7, opção A — D-023): mapa em tela cheia com pino
  fixo no centro (o mapa move por baixo, estilo Uber), busca no topo,
  endereço lido na hora (Nominatim) e botão "Confirmar este local".
  Vagas antigas sem pino mostram o local como texto.
- Provedor: MapLibre GL (web: nativo; app: WebView no MVP) + tiles
  OpenFreeMap (sem chave; trocar por MapTiler com chave própria no
  pré-lançamento) + Nominatim para busca/leitura de endereço.

Categorias iniciais (D-041, aprovadas em 2026-07-09; árvore no banco,
expansível sem código): **Serviços domésticos** (Faxina, Passadeira,
Cozinha), **Cuidados** (Babá, Acompanhante de idosos, Pet), **Eventos**
(Garçom, DJ, Fotógrafo, Montagem), **Reparos e montagem** (Montador de
móveis, Pintura, Jardim), **Mudanças e fretes** (Carreto, Ajudante),
**Aulas** (Reforço, Música, Idiomas), **Beleza** (Cabelo, Unhas,
Maquiagem), **Tecnologia** (Instalações, Suporte) e **Outros**. O anúncio
escolhe a categoria e, opcionalmente, o tipo; a busca pela categoria
inclui os tipos. Profissões regulamentadas ficam fora do MVP
(responsabilidade legal — revisão jurídica no pré-lançamento).

### Ciclo de vida da vaga

```
ABERTA → CANDIDATURA PENDENTE → ACEITA → EM ANDAMENTO
   ▲              │                │           │
   │   (anunciante recusa;        │           └→ AGUARDANDO CONFIRMAÇÃO → CONCLUÍDA
   └── candidato fica bloqueado   ├─ cancelada pelo anunciante (multa)
       para ESTA vaga)            └─ cancelada pelo prestador (punição de reputação)

ABERTA → excluída antes de candidatura/aceite (sem punição) · expirada
```

**Expiração (D-022/D-040):** vaga que chega ao horário de INÍCIO sem
ninguém aprovado expira sozinha — e como nada foi pago antes da escolha,
não há nada a devolver. A busca nunca mostra vagas já iniciadas e a
candidatura a elas é recusada.

### 2.2 Editar e excluir a própria vaga (D-017 — implementado)

- **Excluir**: permitido enquanto ninguém foi aprovado (vaga aberta ou com
  candidato pendente). **Nada foi pago antes da escolha (D-040), então a
  exclusão não move dinheiro.** Após aprovar alguém vira cancelamento,
  com multa (D-018). Botão com confirmação em dois toques na tela da vaga.
- **Editar**: permitido apenas com a vaga **aberta e sem candidato
  pendente** (o candidato se candidatou a termos específicos — decida
  primeiro). Editáveis: categoria, título, descrição, dia/horário e local.
- **O valor NÃO é editável** (nem para cima nem para baixo): os
  candidatos se candidataram a ele (D-017/D-018). Para combinar outro
  valor: excluir a vaga (nada foi pago — D-040) e criar outra.
- Técnica: edição e exclusão passam por Edge Functions (`update-gig`,
  `delete-gig`); a política de UPDATE direto do cliente foi removida
  (migration 0007) para o valor não ser alterável fora do fluxo.

### 2.3 Busca por região (D-029 — implementado)

- As vagas **não aparecem para o país todo**: a busca é limitada à região
  do usuário — centro + **raio ajustável (padrão 30 km**, opções 5–100).
- O centro é sugerido pela **localização do aparelho** e pode ser
  **ajustado manualmente no mapa** (GPS negado → modo manual; nunca é um
  beco sem saída). A região fica **salva no aparelho** e serve SÓ para
  filtrar — nunca é exibida a terceiros.
- Dentro do raio, as vagas vêm **ordenadas por proximidade** e o cartão
  mostra a distância aproximada ("≈ 3 km"), calculada do **pino
  aproximado** (o exato segue protegido — D-030).
- Sem região definida, a busca mostra tudo (com a barra "Definir minha
  região" em destaque). Lista vazia no raio → atalho "Aumentar o raio ou
  mudar o local".
- Técnica: corte por **caixa no servidor** (duas faixas indexáveis sobre
  `approx_lat`/`approx_lng` na view) + círculo exato e ordenação por
  haversine no cliente (função pura compartilhada com o modo demo).
  Vagas antigas sem pino ficam de fora quando há região ativa.

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

### Desistir da candidatura (D-039)

- O prestador pode **desistir de uma candidatura pendente** a qualquer
  momento, sem punição — a vaga segue aberta e a agenda dele nunca esteve
  bloqueada. A candidatura some da lista do anunciante.
- **Recandidatar-se é permitido** enquanto a vaga estiver aberta. Recusa
  do anunciante continua definitiva (D-024).
- **Notificações sem spam:** no máximo uma notificação "novo candidato"
  não lida por vaga; enquanto o anunciante não a vê, novas candidaturas
  (inclusive recandidaturas) não geram outra.
- **Lista ordenada por relevância** (anti-manipulação): Destaque (D-034)
  → serviços concluídos → avaliação; a hora da candidatura é só
  desempate, então sair e voltar não melhora posição.
- Depois de **escolhido**, sair do serviço é cancelamento com multa
  (D-027).

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
- **Prestador** cancela após a escolha (serviço aceito ou em andamento) →
  paga **a mesma multa** (D-027): 25% do valor da vaga, piso de R$ 10,
  como compensação pelo anunciante lesado (80/20 interno, D-019). O
  anunciante recebe **o valor integral de volta** + a compensação. No MVP
  a multa sai da carteira simulada do prestador (pode ficar negativa);
  na Fase 3 é cobrada **no cartão** quando o saldo não cobrir.

### 3.1 Prestador não aparece (furo) — D-071/D-073

- O serviço **já foi pago** (cobrança na escolha), então o furo é tratado como
  uma **disputa de reembolso real**, não um cancelamento automático (D-073).
- Se o prestador **escolhido não inicia** o serviço em até **30 minutos** depois
  do horário (`starts_at + 30min`, ainda `accepted`), o anunciante ganha o botão
  **"Prestador não apareceu"**, que **abre uma disputa** (`no_show`): a vaga vai
  para `disputed` e o **dinheiro congela** — nada é reembolsado ainda.
- O **prestador é avisado e pode se defender** na vaga ("Me defender"): manda um
  texto + fotos (ex.: provar que **o anunciante não deu o código de início**).
- O **suporte decide** no painel de disputas (§6):
  - **Furo confirmado (prestador em falta):** reembolso **integral** ao
    anunciante (líquido + taxa); o prestador fica **devendo a taxa** (dívida) e
    leva um **evento de falta** (reincidência suspende); vaga → cancelada.
  - **Anunciante em falta:** o prestador **recebe o líquido**, **sem** dívida e
    **sem** falta; vaga → concluída. Reembolso parcial fica a critério do suporte.
- **Dívida do furo (quando confirmado):** cobrada dos **ganhos futuros** — ao
  concluir um serviço, até **50% do líquido** abate as dívidas em aberto (o
  prestador **sempre recebe ao menos 50%**), até quitar. A **carteira** mostra a
  dívida e **qual serviço a gerou**.

## 4. Execução e conclusão do serviço

- No horário marcado, o prestador faz **check-in por código** (D-028,
  implementado): digita o código de 4 dígitos exibido na tela do anunciante
  — prova de presença que alimenta disputas.
- Ao final, o prestador toca **"Concluí o serviço"** e pode anexar **fotos
  de como ficou + relato do que foi feito** — opcionais, encorajados
  (D-032): são a defesa dele contra o golpe da "foto antiga", porque o
  que vale é o **horário de envio do servidor** (inadulterável), não a
  data interna da foto.
- O **anunciante confirma** que o serviço foi realizado corretamente —
  essa confirmação libera o pagamento. Ele pode confirmar **já durante o
  "em andamento"** (D-032): o caminho feliz não depende do celular do
  prestador sobreviver ao serviço.
- Proteção contra anunciante que não confirma de má-fé: **liberação
  automática após 48h** sem confirmação nem contestação (D-028).
- Proteção contra prestador sem bateria/internet/celular quebrado
  (D-032): concluir atrasado nunca pune (o toque tardio anexa as provas);
  e um job move "em andamento" → "aguardando confirmação" **12h após o
  fim previsto**, então o pagamento nunca fica preso — no pior caso ele
  chega sozinho ~60h depois do fim, com a janela de contestação intacta.
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

### 5.1 Pagamento na ESCOLHA do candidato (D-040; valores de D-013/D-014)

- **Publicar é GRÁTIS** (D-040): a vaga entra no ar sem pagamento. O
  quadro da taxa na criação vira informação: "você só paga quando
  escolher um candidato".
- **O anunciante escolhe o valor que o PRESTADOR RECEBERÁ (x)** e a taxa
  é somada por cima. **Taxa oficial: 10% (D-035)**: prestador recebe
  R$ 100 → taxa de R$ 10 → o anunciante paga R$ 110 **no Pix da escolha**.
- **O Pix acontece ao ESCOLHER**: a escolha vale por **30 minutos**; o
  candidato só é efetivado (agenda, código de check-in, endereço, chat e
  a notificação "escolhido") **depois que o pagamento confirma**. Escolha
  não paga se desfaz sozinha e a vaga reabre — o candidato nunca soube.
- **O prestador sempre vê o valor escolhido (x)** (na busca, no detalhe,
  na agenda, na carteira): ele recebe integralmente o valor pelo qual se
  candidatou.
- **A plataforma só ganha a taxa quando o serviço acontece**: vaga que
  expira sem escolha ou é excluída antes não custou nada a ninguém.
  Cancelamentos pós-escolha seguem as multas (D-018/D-027) e as disputas
  seguem D-028.
- **Anti-spam/anúncio externo** (o dinheiro na porta saiu, entram):
  filtro de contato no texto do anúncio (telefone/e-mail/link →
  recusado), limite de vagas abertas simultâneas (3 sem histórico de
  anunciante, 10 com), denúncia de vaga (1 toque, fila do admin) e
  1 CPF = 1 conta (D-038).
- Todo movimento financeiro gera **registro imutável em ledger** (auditoria).

### 5.2 Carteira (D-015/D-021/D-037 — implementada; design: rodada 6, opção C)

Duas abas ("Disponível" / "Em processamento"), saldo único em destaque,
saque fixo embaixo e extrato na tela "Histórico". Regras:

- A carteira guarda **só o dinheiro que o usuário RECEBEU** (pagamentos de
  serviços e compensações), menos multas cobradas e saques (D-037). Os
  custos de anunciar (valor + taxa) são pagos **fora da carteira** — Pix
  na publicação — e as devoluções (expiração, exclusão, cancelamento,
  disputa) voltam **por Pix**; esses lançamentos aparecem apenas no
  extrato. Assim a lista "Disponível" sempre soma o saldo exibido.
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
- O saldo disponível é **sacado para a chave Pix cadastrada** (D-035/
  D-036); demais opções (cartões, carteiras digitais) seguem a direção de
  D-016 e a escolha do gateway (⚠️ dúvida #17). O saldo **não paga
  anúncios** (D-037 revê essa parte de D-021): pagar com o saldo exigiria
  transferências internas no provedor — pode voltar como melhoria depois
  do lançamento.
- O **extrato completo** (todos os pagamentos e recebimentos) sai da tela
  principal e fica atrás de um botão **"Ver histórico"**.

## 6. Denúncias, disputas e reembolsos (D-028; backend implementado — D-031; UI na rodada 10)

- **Quem analisa:** o David, num **painel admin simples** (web). Cada caso
  exibe: relato do anunciante, fotos, **as provas de conclusão do
  prestador (fotos + relato, com horário de envio — D-032)**, a conversa
  do chat (imutável), o check-in (código digitado ou não), e o
  histórico/reputação das duas partes. Decisão com um clique.
- **Quando pode contestar:** (a) antes da liberação — em vez de confirmar
  a conclusão, o anunciante **contesta**, congelando o pagamento; (b)
  depois da liberação — durante os **7 dias de processamento** (D-016) o
  anunciante pode abrir **pedido de reembolso**, que congela o valor
  contestado na carteira do prestador.
- **Auto-liberação em 48h** (D-028): sem confirmação nem contestação, o
  pagamento libera sozinho.
- **Pedido de reembolso:** relato em texto **obrigatório** + até 5 fotos
  opcionais.
- **Resultado:** procedente → reembolso **total ou parcial** (percentual
  definido na análise), sempre **limitado ao valor do serviço** (a taxa
  nunca é reembolsada); o restante é liberado ao prestador. Improcedente →
  valor liberado integralmente ao prestador.
- A plataforma **não compensa com dinheiro próprio** (D-002/princípios):
  compensações não-financeiras (prioridade) para lesados.
- Má-fé reincidente (denúncias improcedentes repetidas, dos dois lados):
  avaliada no painel; pode levar a suspensão. ⚠️ regras exatas a calibrar
  com o uso.
- **Implementação (D-031):** uma disputa por vaga (espelha o reembolso
  único — D-020); status `disputed` congela o escrow pré-liberação (o job
  de 48h não o toca); pós-liberação o congelamento é derivado (disputa
  aberta → pagamento fica "em análise" na carteira e fora do saque);
  fotos em bucket privado e **imutáveis** (evidência não pode ser
  apagada); durante a disputa o chat **não envia** (histórico segue
  legível — é parte da análise); resolução atômica (só a primeira decisão
  move dinheiro) via `resolve-dispute`, restrita a `profiles.is_admin`.

### 6.1 Integridade e anti-abuso (D-046 — implementado)

- **Sem contato fora do app:** o texto da **vaga** e do **perfil** (nome +
  bio) barra telefone, e-mail, link e rede social — inclusive disfarçados
  (número por extenso, dígitos espaçados, `@handle`). O contato acontece
  no app, depois da escolha paga. Aviso anti-golpe fixo no chat.
- **Conteúdo proibido na vaga:** drogas, armas e sexual explícito são
  bloqueados na publicação. Casos ambíguos (ex.: discriminação) vão para
  as **denúncias** (revisão humana no painel).
- **1 CPF = 1 conta, à prova de recriação:** CPF obrigatório e único por
  conta; um registro (hash) sobrevive à exclusão da conta guardando
  penalidades — **deletar e recriar a conta não zera** suspensão/ban (a
  conta nova herda a suspensão vigente do CPF).
- **Suspensão automática por reincidência:** 3 cancelamentos de última
  hora (≤24h do início) em 30 dias **ou** 2 denúncias procedentes em 30
  dias → **7 dias** sem publicar nem se candidatar (limiares/prazo a rever
  no pré-lançamento). Fora da lista atual (próxima leva): anti
  auto-negócio (Sybil), verificação por SMS, OCR em imagens.

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

## 9. Mensagens entre as partes (implementado — D-025, rodada 9 opção B)

- **Uma conversa por serviço**, entre o anunciante e o prestador
  **escolhido** — nunca durante a fase anônima de candidatura (D-024).
- Disponível **do momento da escolha até a conclusão** (combinar chegada,
  avisar atraso). **Na conclusão a conversa encerra** (D-026): ninguém
  mais envia; o histórico fica legível para os dois (registro, §6).
- **Bloqueio corta o envio nos dois sentidos** (§8); mensagens antigas
  continuam legíveis (registro).
- Mensagens **imutáveis** (sem editar/apagar — proteção em disputas, §6) e
  entregues **em tempo real**; só os dois participantes conseguem ler
  (RLS; verificado e2e, incluindo falsificação de remetente).
- UI (opção B): bolhas clássicas + **respostas prontas de um toque** acima
  do teclado; botão "Conversar" na tela do serviço com **contador de
  mensagens novas** (marca de leitura por usuário).

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
