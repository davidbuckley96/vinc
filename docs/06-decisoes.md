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
