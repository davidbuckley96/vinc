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
rascunho? → ABERTA → ACEITA → EM ANDAMENTO → CONCLUÍDA
                │        │
                │        ├─ cancelada pelo anunciante (multa)
                │        ├─ prestador rejeitado pelo anunciante (multa)
                │        └─ cancelada pelo prestador (punição de reputação)
                └─ excluída antes de aceite (sem punição)
```

## 3. Aceite de vaga (sem processo seletivo)

- Qualquer prestador pode aceitar uma vaga **ABERTA** com poucos cliques.
- **Não há processo seletivo**: o primeiro aceite vincula o prestador à vaga.
  O aceite deve ser **atômico** no backend (duas pessoas não podem aceitar a
  mesma vaga).
- **Conflito de agenda:** o app impede (ou alerta fortemente ⚠️) o aceite de
  vagas que conflitem com a agenda semanal do prestador (outros serviços já
  aceitos e bloqueios de horário definidos por ele).

### Punições pós-aceite
- **Anunciante** exclui a vaga ou rejeita o prestador após o aceite → paga
  **multa** (valor/percentual ⚠️ em aberto). Destino da multa ⚠️ em aberto.
- **Prestador** cancela após o aceite → sem multa financeira na fase inicial,
  mas sofre punição de reputação/prioridade (modelo Uber). Regras exatas ⚠️.

## 4. Execução e conclusão do serviço

- No horário marcado, o serviço entra **EM ANDAMENTO** (mecânica de check-in ⚠️).
- Ao final, o prestador marca como concluído e o **anunciante confirma** que o
  serviço foi realizado corretamente — essa confirmação libera o pagamento.
- Proteção contra anunciante que não confirma de má-fé: liberação automática
  após prazo se não houver contestação (prazo ⚠️ em aberto).
- Proteção contra serviço malfeito (ex.: faxina pela metade): o anunciante pode
  **contestar antes da liberação**, abrindo uma disputa (ver §6).

## 5. Pagamentos (MVP: simulado — decisão D-003)

- No MVP toda a mecânica financeira funciona com **saldo simulado** (carteira
  interna), sem gateway real. A arquitetura já modela o fluxo real:
  1. Vaga aceita → valor do anunciante fica **retido** (escrow).
  2. Serviço concluído e confirmado → valor **liberado** para a carteira do
     prestador.
  3. Prestador **saca** para conta bancária (no MVP: saque simulado; no futuro:
     Pix via gateway — Mercado Pago/Pagar.me, a definir na Fase 3).
- **Taxa da plataforma**: percentual sobre o valor do serviço ⚠️ em aberto.
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

## 8. Home / Calendário (tela principal)

- Calendário com visões **diária (dividida por hora), semanal e mensal**.
- O usuário seleciona um horário e escolhe entre:
  - **Buscar serviços abertos** naquele horário (papel prestador), ou
  - **Criar um anúncio** para aquele horário (papel anunciante).
- A agenda mostra os compromissos do usuário: serviços aceitos (como prestador)
  e vagas anunciadas (como anunciante).
- Fluxo central do produto: "tenho o dia X livre → preencho com um bico".

## 9. Requisitos não-funcionais

- **Plataformas:** Android, iOS e web (desktop e mobile) com um só código.
- **Acessibilidade/simplicidade:** usável por pessoas de baixa escolaridade;
  poucos cliques por fluxo; textos curtos e diretos em pt-BR.
- **Escalabilidade do código:** baixo acoplamento, features isoladas, lógica de
  domínio reutilizável (ver `03-arquitetura.md`).
- **Segurança:** RLS no banco, regras financeiras somente no backend (nunca
  confiar no cliente), ledger auditável.

## 10. Escopo do MVP (Fase 1 do roadmap)

**Dentro:** auth + perfil, calendário home (3 visões), criar/editar/excluir
vaga, listar/buscar vagas por horário e categoria, aceite atômico com checagem
de conflito, ciclo de vida completo do serviço, confirmação de conclusão,
carteira simulada com escrow e multa, avaliações mútuas, perfil público com
reputação.

**Fora (fases seguintes):** pagamentos reais/Pix, denúncias e disputas, chat,
notificações push, geolocalização/mapa, KYC, painel administrativo.
