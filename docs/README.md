# Documentação do Vinc

Fonte única de verdade do projeto. Qualquer sessão de desenvolvimento deve
começar por aqui — o contexto do projeto **não** depende de histórico de
conversas.

## Índice

| # | Arquivo | Conteúdo | Quando ler |
|---|---|---|---|
| 01 | [visao-geral.md](01-visao-geral.md) | Problema, visão do produto, princípios norteadores | Sempre, em sessão nova |
| 02 | [especificacao-produto.md](02-especificacao-produto.md) | Papéis de usuário, fluxos, regras de negócio, escopo do MVP | Antes de implementar qualquer feature |
| 03 | [arquitetura.md](03-arquitetura.md) | Stack, monorepo, modelo de dados, princípios técnicos | Antes de escrever/alterar código |
| 04 | [design.md](04-design.md) | Diretrizes visuais + processo de opções de UI | Antes de qualquer trabalho de interface |
| 05 | [roadmap.md](05-roadmap.md) | Fases do projeto e **estado atual** | Sempre, em sessão nova |
| 06 | [decisoes.md](06-decisoes.md) | Registro de decisões (ADR) | Ao tomar ou consultar decisões |
| 07 | [duvidas-abertas.md](07-duvidas-abertas.md) | Questões pendentes do David | Antes de perguntar algo (pode já estar registrado) |

## Regras de manutenção

- Decisão tomada → registrar em `06-decisoes.md` **e** atualizar as specs afetadas, no mesmo commit.
- Dúvida sem resposta → registrar em `07-duvidas-abertas.md`; quando respondida, migrar para `06-decisoes.md`.
- Etapa concluída → atualizar "Estado atual" em `05-roadmap.md`.
- Documentação em pt-BR; código em inglês.
