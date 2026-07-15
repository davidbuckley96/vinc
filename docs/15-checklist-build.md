# 15 — Checklist de teste no aparelho (build acumulado)

> Muita coisa acumulou desde o último build que o David testou. Este checklist
> cobre **tudo que mudou e precisa de verificação no aparelho**. Legenda de risco:
> 🔴 crítico (dinheiro/segurança) · 🟡 importante · 🟢 secundário.
>
> **Cobertura automatizada:** só a lógica pura do `packages/core` tem testes
> (vitest, 67 ✓). As integrações externas (Supabase, Sentry, mapa, geocoding,
> push) **não têm teste automatizado** — foram verificadas por e2e no servidor;
> este checklist é a validação no aparelho. Marcado com ✔️servidor o que já foi
> confirmado na base real (risco menor, mas vale conferir a experiência).

## 0 · Smoke test (fazer primeiro)
- [ ] 🔴 O app **abre sem crashar** (valida o Sentry nativo — foi o único ponto
  que não deu pra testar aqui). Se abrir e navegar normalmente, o Sentry está ok.
  *Se crashar no start*, reverter o commit `46c7af9` e me avisar o erro.
- [ ] 🟡 Fazer login (e-mail/senha e Google) e navegar pelas abas sem erro.
- [ ] 🟢 Conferir no dashboard do Sentry (sentry.io) se chega algum evento quando
  algo dá erro de propósito (opcional).

## 1 · Mapa e localização
- [ ] 🔴 **Mapa da vaga aberta fica FLUIDO** ao arrastar — tanto na conta do
  **anunciante** quanto na do **trabalhador** (era o bug principal: travava pro
  trabalhador). Não deve ter mais o círculo roxo.
- [ ] 🟡 O mapa da vaga aproximada **abre centrado no bairro** (não na rua exata). ✔️servidor
- [ ] 🟡 **Busca de endereço no mapa funciona no 4G** (digitar bairro/rua e
  aparecerem sugestões) — era o bug do "não encontra nada" no celular.
- [ ] 🟡 Criar vaga escolhendo **só o bairro** (sem número/rua) → depois, no mapa
  da vaga, aparece centrado no bairro certo (não "Região aproximada"). ✔️servidor
- [ ] 🟢 Estando em Portugal, o mapa/sugestões **não** puxam pra Portugal (ignora
  o GPS fora do Brasil).
- [ ] 🟢 Escolher um ponto no mar → bloqueia ("escolha um ponto em terra").

## 2 · Fotos, câmera e conclusão de serviço  🔴 (bugs que te travaram)
- [ ] 🔴 **Finalizar serviço COM foto + comentário** → o botão funciona (era
  no-op). Testar com 1+ fotos e texto.
- [ ] 🔴 **Pedir reembolso/contestar COM foto + comentário** → o botão funciona
  (mesmo bug).
- [ ] 🟡 Na conclusão, tocar em adicionar foto abre **"Tirar foto / Escolher da
  galeria"**; "tirar foto" abre a câmera e anexa.
- [ ] 🟡 Trocar a **foto de perfil** → a nova foto aparece na hora (não fica a
  antiga até reabrir).
- [ ] 🟢 Link **"Falar com o suporte"** aparece na tela de conclusão e abre a
  Central de Ajuda.

## 3 · Travas de tempo do serviço  🔴 ✔️servidor
- [ ] 🔴 Tentar **iniciar** um serviço marcado pra **outro dia** → bloqueia
  ("só a partir de 30 min antes"). Antes dava pra iniciar amanhã.
- [ ] 🔴 Tentar **finalizar** logo depois de iniciar → bloqueia ("precisa durar
  pelo menos 30 min").
- [ ] 🟡 O **código de início** só aparece pro anunciante **30 min antes** do
  horário (antes disso, mostra a dica "aparece 30 min antes").
- [ ] 🟡 Trabalhador em serviço vê o link **"reportar um problema durante o
  serviço"** → abre o suporte.
- [ ] 🟢 (Se tiver conta admin) no painel de suporte, o botão **"Finalizar"**
  encerra um serviço em andamento antes dos 30 min. ✔️servidor

## 4 · Nota e reputação  🟡 ✔️servidor
- [ ] 🟡 Dar uma **nota baixa** a um usuário novo (nota 5) → a nota **não
  despenca** (ex.: 5 → uma nota 2 vira ~4,5, não 2,0). Média bayesiana.
- [ ] 🟢 A nota aparece com **1 casa decimal** (ex.: "4,5", não "4,50" nem "2").

## 5 · Mensagens (aba nova)  🟡
- [ ] 🟡 A nova aba **"Mensagens"** aparece na barra de baixo e lista as conversas
  (foto, nome, última mensagem, hora, não-lidas + chip da vaga/status).
- [ ] 🟡 Tocar numa conversa **abre o chat**; enviar/receber mensagem atualiza a
  lista e o badge.
- [ ] 🟡 **Push de mensagem** chega com "Nome: última mensagem"; mensagens
  seguidas **não** viram vários avisos (anti-spam). ✔️servidor
- [ ] 🟢 Conversa de serviço **concluído** some da lista depois de ~1 mês (não dá
  pra testar rápido; só conferir que concluídos recentes aparecem). ✔️servidor
- [ ] 🟢 **Barra com 6 abas** — avaliar se fica bom ou se prefere tirar a Carteira
  da barra (me avisa).

## 6 · Notificações e push  🟡
- [ ] 🟡 O botão **"Testar notificações"** no perfil entrega um push no aparelho.
- [ ] 🟡 Criar um **alerta de vagas** (com **várias categorias**) e publicar uma
  vaga que combina → chega o push de "nova vaga". ✔️servidor (o match)
- [ ] 🟡 Quando um pagamento é **liberado e depois contestado**, a notificação
  antiga vira **"a liberação foi pausada — em análise"** (não fica "liberado").

## 7 · Busca e filtros  🟢
- [ ] 🟢 Abrir o **calendário de faixa** depois de usar os chips "Hoje/Amanhã" →
  ele reflete o filtro (não abre vazio).
- [ ] 🟢 Filtros de **distância** e **região por nome** funcionam.

## 8 · Coerência (papéis)  🟢 ✔️servidor
- [ ] 🟢 Na **própria vaga**, o dono **não** vê "Me candidatar"/"Denunciar" (vê
  "Gerenciar minha vaga"); não aparece pra si mesmo em bloquear.
- [ ] 🟢 Lista de **candidatos mostra a foto**; abrir a lista de uma vaga com
  vários candidatos é rápido (sem travar). ✔️servidor (N+1 corrigido)

---

## Prioridade sugerida de teste
1. **Smoke (0)** — confirmar que o app abre (Sentry).
2. **Fotos/conclusão (2)** e **travas de tempo (3)** — eram os que mais te
   travaram / envolvem dinheiro.
3. **Mapa (1)** — o bug que mais voltou.
4. **Mensagens (5)** — feature nova.
5. O resto conforme sobrar tempo.

Se algo falhar, me manda print/descrição que eu ajusto — a maior parte do
servidor já está validada, então provável que qualquer problema seja de UI.
