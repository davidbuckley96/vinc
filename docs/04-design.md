# 04 — Design

## Diretrizes visuais

- **Minimalista, padrão big tech** (referências: Uber, iFood, Airbnb, Instagram):
  muito espaço em branco, hierarquia tipográfica clara, poucas cores, ícones
  simples e universais.
- **Feito para baixa escolaridade:** textos curtos e concretos ("Aceitar
  serviço", nunca jargão), ícones sempre acompanhados de rótulo, um objetivo
  por tela, botões grandes, fluxo principal em pouquíssimos toques.
- **Confiança visível:** nota, número de avaliações e serviços concluídos
  aparecem de forma proeminente em qualquer cartão/perfil de usuário.
- **Dinheiro sempre claro:** valores em destaque, sem letras miúdas.
- Suporte a **modo claro e escuro** desde o início (tokens, nunca cores fixas).
- Acessibilidade: contraste AA, alvos de toque ≥ 44pt, fontes escaláveis.

## Processo obrigatório para qualquer trabalho de UI

> Regra definida pelo David: **nenhuma interface é implementada sem antes
> apresentar opções de design.**

1. Antes de implementar uma tela/fluxo novo (ou redesenhar um existente),
   apresentar **2–3 opções de design** — descrições claras e/ou protótipos
   (HTML/imagem) — destacando as diferenças e um recomendado.
2. David escolhe (ou pede ajustes); a escolha é registrada em
   `06-decisoes.md`.
3. Só então implementar, usando os tokens e componentes do design system.

## Direção visual escolhida (D-005)

Rodada 1 (`docs/design/rodada-01-direcao-visual.html`): David escolheu a
**Opção C — "Fintech" (roxo)**, inspirada no Nubank:

- **Primária:** roxo `#6D28D9` (claro) / `#7C3AED` (escuro); cabeçalho sólido
  roxo com cantos inferiores arredondados (raio 24).
- **Superfícies:** fundo branco/quase-preto, cartões suaves em lilás
  (`primarySoft`), bordas tracejadas lilás para horários livres.
- **Compromissos na agenda:** cartão lilás com borda esquerda roxa, título em
  roxo profundo e metadados (horário · valor · nota) em roxo médio.
- Tokens completos (claro + escuro) em `apps/mobile/src/constants/theme.ts` —
  única fonte de cor do app; proibido hardcode de cor em telas.

## Design system

- Tokens (cores, raios, espaçamento, fontes) em
  `apps/mobile/src/constants/theme.ts`.
- Componentes base reutilizáveis em `apps/mobile/src/components/`
  (a biblioteca cresce conforme as features: Button, Card, Avatar,
  RatingStars, MoneyText, TimeSlot, EmptyState, ...).

## Identidade / logo (D-042)

- **Símbolo**: o "V da pessoa no centro" — duas linhas que fecham num
  vértice único e o ponto lilás na abertura, como uma pessoa de braços
  abertos. Conceito: *Vinc = vínculo*, com gente no meio.
- **Cores**: caixa roxa `#6D28D9`, traços brancos, ponto lilás `#A78BFA`
  (variante clara: caixa branca + traços roxos).
- **Arquivos-fonte**: `docs/design/logo/` (ícone, variante clara, símbolo
  solto e assinatura completa com o wordmark "vinc").
- **No app**: componente `VincLogo` (`apps/mobile/src/components/
  vinc-logo.tsx`); ícones/favicon/splash gerados do mesmo SVG.
- Wordmark: "vinc" minúsculo, peso 800, tracking apertado (system font
  por enquanto; fonte própria pode entrar perto do lançamento).
