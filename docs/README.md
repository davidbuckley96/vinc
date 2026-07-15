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
| 08 | [pesquisa-cobranca-taxa.md](08-pesquisa-cobranca-taxa.md) | Pesquisa: quando cobrar a taxa (cold start × ads externos) | Ao decidir o modelo de cobrança (dúvida #24) |
| 09 | [suporte-e-moderacao.md](09-suporte-e-moderacao.md) | Suporte, assistente Vi e moderação (arquitetura + fases) | Ao trabalhar em suporte/denúncias |
| 10 | [infra-cicd-observabilidade.md](10-infra-cicd-observabilidade.md) | Infra, CI/CD, observabilidade e escalabilidade | Ao mexer em deploy/infra |
| 11 | [bugs-e-melhorias.md](11-bugs-e-melhorias.md) | Roadmap de bugs/melhorias do 2º ciclo de testes (antes/depois) | Ao corrigir os itens B-01…B-30 |
| 12 | [feedback-video-aparelho.md](12-feedback-video-aparelho.md) | 3º ciclo: feedback do vídeo no APK real (V-01…V-06) | Ao corrigir os itens do teste no aparelho |
| 13 | [revisao-codigo-roadmap.md](13-revisao-codigo-roadmap.md) | Revisão de arquitetura pós-B/V + roadmap de refatoração (Fases A–D) | Ao pagar débito técnico / refatorar |
| 14 | [feedback-4-testes.md](14-feedback-4-testes.md) | 4º ciclo: feedback do David (F-01…F-12) — bugs, features, regras | Ao trabalhar nos itens F-01…F-12 |
| 15 | [checklist-build.md](15-checklist-build.md) | Checklist de teste no aparelho (build acumulado) + cobertura de testes | Antes/depois de cada build de teste |

## Regras de manutenção

- Decisão tomada → registrar em `06-decisoes.md` **e** atualizar as specs afetadas, no mesmo commit.
- Dúvida sem resposta → registrar em `07-duvidas-abertas.md`; quando respondida, migrar para `06-decisoes.md`.
- Etapa concluída → atualizar "Estado atual" em `05-roadmap.md`.
- Documentação em pt-BR; código em inglês.
