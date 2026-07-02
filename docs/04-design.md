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

## Design system

- Tokens (cores, tipografia, espaçamento, raios, sombras) definidos em
  `packages/core` ou `apps/mobile/src/components/theme/` — a definir na
  primeira tarefa de UI, junto com a escolha da direção visual.
- Componentes base reutilizáveis em `apps/mobile/src/components/`
  (Button, Card, Avatar, RatingStars, MoneyText, TimeSlot, EmptyState, ...).
- ⚠️ Direção visual (paleta, tipografia, tom) ainda não escolhida — será a
  primeira rodada de opções de design (ver `07-duvidas-abertas.md`).
