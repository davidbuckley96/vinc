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
| Valor do serviço (BRL) | R$ 160,00 |
| Local | Escolhido **no mapa** (ver §2.1) — nível de detalhe exibido antes do aceite ⚠️ em aberto |

### 2.1 Localização por mapa (definido pelo David em 2026-07-03)

- **Na criação do anúncio**, o local NÃO é uma caixa de texto livre (evita
  endereços inexistentes/ambíguos). A pessoa escolhe no **mapa**, estilo
  Uber/iFood: arrastando o pino OU digitando na caixa de busca dentro do
  próprio mapa (geocodificação).
- **Na visualização da vaga** (antes e depois do aceite), o endereço é
  clicável e abre um **modal com o mapa** mostrando o pino do local, com um
  botão de fechar.
- Requisitos técnicos: colunas `lat`/`lng` na tabela `gigs`; provedor de
  mapas/geocodificação a decidir (⚠️ `07-duvidas-abertas.md`).
- **Rodada de opções de design obrigatória** antes de implementar (processo
  padrão de UI).

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

## 3. Candidatura e aprovação (modelo Uber — definido pelo David em 2026-07-03)

- O prestador **se candidata** a uma vaga ABERTA com poucos cliques. A
  candidatura deve ser **atômica** no backend: no momento em que existe um
  candidato, a vaga sai da busca e **ninguém mais pode se candidatar**.
- O **anunciante recebe uma notificação** para **aceitar ou recusar** o
  candidato (no MVP, aviso dentro do app — agenda e tela do serviço; push
  real na Fase 2). Ele **não escolhe entre vários candidatos**: como no Uber
  (o passageiro não escolhe o motorista), é um candidato por vez, sim ou não.
- **Recusa (sem multa):** a vaga volta a ficar ABERTA para os demais, e o
  candidato recusado **nunca mais vê nem pode se candidatar a ESTA vaga**.
  A recusa vale só para o serviço em questão: o mesmo trabalhador pode se
  candidatar normalmente a outras vagas (novas ou abertas) do mesmo
  anunciante — salvo bloqueio entre usuários (ver §8).
- **Aprovação:** vira o vínculo (ACEITA). O pagamento já foi feito na
  criação da vaga (ver §5.1 — D-013): o líquido segue retido em escrow até a
  conclusão. O backend re-checa o conflito de agenda do candidato na
  aprovação (ele pode ter aceitado outro serviço enquanto esperava);
  havendo conflito, a candidatura é recusada automaticamente.
- **Conflito de agenda:** o backend impede candidatura a vagas que conflitem
  com os compromissos do prestador (serviços aceitos/em andamento e
  candidaturas pendentes dele).

### Punições pós-aprovação
- **Anunciante** exclui a vaga ou cancela após aprovar → paga **multa**
  (valor/percentual ⚠️ em aberto). Destino da multa ⚠️ em aberto.
  Recusar uma candidatura NÃO gera multa.
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
  2. Serviço concluído e confirmado → o **líquido** é liberado para a
     carteira do prestador.
  3. Prestador **saca** para conta bancária (no MVP: saque simulado; no
     futuro: Pix via gateway — Fase 3).

### 5.1 Taxa de serviço na criação (D-013)

- Exemplo (valores ilustrativos, percentual final ⚠️ em aberto): vaga de
  R$ 100 → taxa de R$ 10 fica com a empresa → o prestador recebe R$ 90.
- **O prestador sempre vê o valor líquido** (na busca, no detalhe, na
  agenda, na carteira): ele recebe integralmente o valor pelo qual se
  candidatou. A **prévia** do anúncio na criação mostra o líquido.
- A **taxa aparece explícita no momento da criação** ("Valor da vaga
  R$ 100 · Taxa de serviço R$ 10 · O prestador recebe R$ 90").
- **Reembolso:** se ninguém se candidatar, se o anunciante recusar todos os
  candidatos ou se ele excluir a vaga antes de aprovar alguém, o **líquido é
  reembolsado** (R$ 90 no exemplo) — **a taxa fica com a empresa**. Isso
  impede o golpe de "recusar indefinidamente esperando reembolso total":
  arrepender-se de abrir a vaga custa a taxa.
- Multas são cobradas do saldo/forma de pagamento do anunciante infrator.
- Todo movimento financeiro gera **registro imutável em ledger** (auditoria).

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

## 9. Home / Calendário (tela principal)

- Calendário com visões **diária (dividida por hora), semanal e mensal**.
- O usuário seleciona um horário e escolhe entre:
  - **Buscar serviços abertos** naquele horário (papel prestador), ou
  - **Criar um anúncio** para aquele horário (papel anunciante).
- A agenda mostra os compromissos do usuário: serviços aceitos (como prestador)
  e vagas anunciadas (como anunciante).
- Fluxo central do produto: "tenho o dia X livre → preencho com um bico".

## 10. Requisitos não-funcionais

- **Plataformas:** Android, iOS e web (desktop e mobile) com um só código.
- **Acessibilidade/simplicidade:** usável por pessoas de baixa escolaridade;
  poucos cliques por fluxo; textos curtos e diretos em pt-BR.
- **Escalabilidade do código:** baixo acoplamento, features isoladas, lógica de
  domínio reutilizável (ver `03-arquitetura.md`).
- **Segurança:** RLS no banco, regras financeiras somente no backend (nunca
  confiar no cliente), ledger auditável.

## 11. Escopo do MVP (Fase 1 do roadmap)

**Dentro:** auth + perfil, calendário home (3 visões), criar/editar/excluir
vaga, listar/buscar vagas por horário e categoria, aceite atômico com checagem
de conflito, ciclo de vida completo do serviço, confirmação de conclusão,
carteira simulada com escrow e multa, avaliações mútuas, perfil público com
reputação.

**Fora (fases seguintes):** pagamentos reais/Pix, denúncias e disputas, chat,
notificações push, geolocalização/mapa, KYC, painel administrativo.
