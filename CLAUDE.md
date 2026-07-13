# Vinc — Instruções para o Claude Code

> **LEIA ISTO PRIMEIRO em toda sessão nova.** Este arquivo e o diretório `docs/`
> são a fonte única de verdade do projeto. O contexto NUNCA depende do histórico
> de conversas: tudo o que importa está versionado em arquivos `.md` neste repositório.

## O que é o Vinc

Marketplace de serviços por horário ("bicos") para o mercado brasileiro:
pessoas anunciam vagas de trabalho em horários específicos com valor definido,
e prestadores de serviço aceitam essas vagas pelo app — sem processo seletivo —
recebendo o pagamento pela plataforma ao concluir o serviço.
Visão completa em `docs/01-visao-geral.md`.

## Regras de trabalho (obrigatórias)

1. **Documentação primeiro.** Antes de qualquer tarefa, leia `docs/README.md`
   (índice) e os arquivos relevantes ao que for fazer.
2. **Toda decisão vira documento.** Decisões de produto/arquitetura tomadas com
   o David devem ser registradas em `docs/06-decisoes.md` no mesmo commit.
   Especificações afetadas devem ser atualizadas.
3. **Dúvidas não inferíveis → perguntar ao David** (dono do produto) antes de
   implementar. Dúvidas ainda sem resposta ficam em `docs/07-duvidas-abertas.md`.
4. **UI sempre com opções.** Antes de implementar qualquer interface, apresente
   2–3 opções de design para o David escolher (ver processo em `docs/04-design.md`).
5. **Idioma.** Comunicação com o usuário, documentação e textos do app em
   português (pt-BR). Código (nomes de variáveis, funções, commits) em inglês.
6. **Arquitetura desacoplada.** Siga os princípios de `docs/03-arquitetura.md`:
   baixo acoplamento, lógica de domínio pura e reutilizável, features isoladas.
7. **Simplicidade é requisito de produto.** O app deve ser usável por pessoas
   de baixa escolaridade: poucos cliques, linguagem simples, fluxos óbvios
   (referências: Uber, iFood, Instagram).

## Mapa da documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/01-visao-geral.md` | Problema, visão do produto, princípios |
| `docs/02-especificacao-produto.md` | Papéis, fluxos, regras de negócio, escopo do MVP |
| `docs/03-arquitetura.md` | Stack, estrutura do monorepo, modelo de dados, princípios técnicos |
| `docs/04-design.md` | Diretrizes de design minimalista + processo de escolha de UI |
| `docs/05-roadmap.md` | Fases de desenvolvimento e estado atual |
| `docs/06-decisoes.md` | Registro de decisões (ADR) com data e justificativa |
| `docs/07-duvidas-abertas.md` | Questões pendentes de resposta do David |
| `docs/09-suporte-e-moderacao.md` | Suporte, a "Vi" (IA) e moderação/denúncias |
| `docs/10-infra-cicd-observabilidade.md` | Plano de infra, CI/CD, observabilidade e build |

## Stack (resumo)

- **App:** React Native + Expo (TypeScript) — iOS, Android e web com um só código.
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions).
- **Monorepo:** pnpm workspaces (`apps/`, `packages/`, `supabase/`).
- **Pagamentos:** simulados no MVP; gateway real (Pix) em fase posterior.

## Estado atual

Consulte a seção "Estado atual" em `docs/05-roadmap.md` — ela deve ser
atualizada ao final de cada etapa concluída.
