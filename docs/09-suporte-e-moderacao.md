# 09 — Suporte, assistente "Vi" e moderação

> Pedido do David (2026-07-09): comunicação fácil entre usuários e suporte,
> começando por um **assistente de IA ("Vi")** que resolve o simples por
> texto; **cards de perguntas frequentes**; um **"Outros"** com opções menos
> comuns e, por último, **"Falar com o suporte"** (humano) — para o humano
> só receber o que a IA não resolveu. Do lado da equipe, um **painel
> completo** com contexto do usuário (perfil, vagas, pagamentos) e ações
> para destravar bloqueios (ex.: cancelar vaga que a pessoa não consegue),
> além de **denúncias** de vaga/conversa/perfil para aprovar ou não.

## 1. Pesquisa que orienta o desenho

- **Deixe a IA resolver o comum, mas nunca prenda o usuário.** Quando a
  pessoa pede humano, escale **na hora, sem loop** — prender frustrado é o
  jeito mais rápido de perder confiança. Times que medem *re-contato em
  48h* (não só "deflexão") e cuidam da base de conhecimento chegam a
  55–70% de resolução real pela IA.
- **Base de conhecimento é a variável de maior impacto.** FAQ bem escrito
  aumenta a resolução em 15–25%. Por isso a Vi é alimentada pelo MESMO
  conteúdo dos cards de perguntas frequentes (fonte única).
- **Handoff sem perder contexto.** 85% dos handoffs perdem o histórico. No
  Vinc, ao escalar, o humano recebe a conversa inteira com a Vi + o
  contexto do usuário já anexado (nada de "repita seu problema").
- **O agente precisa de contexto unificado.** Um bom painel mostra, numa
  tela, quem é a pessoa, o histórico dela e os itens relacionados (vagas,
  pagamentos, disputas) — sem caçar em telas separadas.

Fontes: eesel.ai (escalonamento/deflexão), alhena.ai e BlueTweak (handoff),
Kustomer (deflexão), Supportbench e Zendesk (contexto do agente).

## 2. Arquitetura

Reaproveita o que já existe: o **painel /admin** (bloco 2.5, RLS por
`profiles.is_admin`) vira o **Painel do Suporte**; o `gig_reports` (D-040)
é generalizado para denúncias de qualquer alvo.

### 2.1 Dados (Fase S1)
- **`reports`** (unifica denúncias): `target_type` (`gig` | `message` |
  `profile`), `target_id`, `reporter_id`, `category`, `reason`, `status`
  (`pending` | `actioned` | `dismissed`), `resolved_by`, `resolved_at`.
  Único por (target, reporter). Migra as linhas de `gig_reports` e o
  `gig_reports` é aposentado.
- **`support_tickets`**: `user_id`, `topic`, `status` (`ai` |
  `waiting_support` | `resolved`), `assigned_admin`, timestamps. Nasce em
  `ai` (conversando com a Vi) e vira `waiting_support` ao escalar.
- **`support_messages`**: `ticket_id`, `sender` (`user` | `ai` |
  `agent`), `body`, `created_at`. É a conversa da Vi e, depois, do humano.
- **`faq_articles`** (base de conhecimento): `question`, `answer`,
  `category`, `sort_order`. Renderiza os cards E alimenta a Vi (fonte
  única). Editável pelo suporte no painel (fase posterior).

RLS: o usuário lê/escreve só os próprios tickets/mensagens e cria
denúncias; `faq_articles` é leitura pública; o painel (is_admin) lê tudo
e resolve.

### 2.2 A Vi (Fase S3) — assistente de IA
Edge Function `support-assistant`: recebe a mensagem + a conversa + a
base de FAQ + um **resumo seguro** do contexto do usuário (suas vagas,
status, saldo — nunca dados de terceiros), chama um LLM e responde em
pt-BR. Regras:
- Escala para humano **imediatamente** se a pessoa pedir, ou se a Vi não
  tiver confiança (marca o ticket `waiting_support`).
- **Porta de IA trocável** (como a `PaymentProvider`): um adapter por
  provedor selecionado por env, para começar barato/grátis e trocar sem
  reescrever nada. ⚠️ **Decisão do David pendente** — ver §4.
- A Vi **sugere ações** mas não executa nada sensível sozinha; quem
  destrava (cancelar vaga, liberar pagamento) é o suporte no painel, com
  registro.

### 2.3 Painel do Suporte (Fase S4)
Abas no /admin (além da fila de disputas que já existe):
- **Denúncias**: fila de `reports` (vaga/conversa/perfil) com o conteúdo
  denunciado à vista → **agir** (ocultar vaga, advertir, remover) ou
  **arquivar**. Toda ação registrada.
- **Tickets de suporte**: conversas escaladas da Vi, com o histórico e o
  contexto do usuário anexado; responder e resolver.
- **Buscar usuário → contexto 360°**: perfil, reputação, vagas (como
  anunciante e prestador) com status, histórico de pagamentos (ledger),
  disputas. Numa tela.
- **Ações de desbloqueio**: cancelar/expirar uma vaga em nome do usuário,
  reabrir, etc. — via Edge Functions dedicadas, sempre com log de quem
  fez (admin) e por quê.

## 3. Fases de execução

| Fase | Entrega | Precisa de |
|---|---|---|
| **S1** | Tabelas (reports unificado, tickets, mensagens, faq) + RLS + seed de FAQ | — (inferível) |
| **S2** | Central de Ajuda do usuário (cards FAQ + Vi + Outros + Falar com suporte) | **rodada de design 17** |
| **S3** | A Vi de verdade (Edge Function + adapter de LLM) | **decisão do LLM (§4)** |
| **S4** | Painel do Suporte (denúncias, tickets, contexto 360°, ações) | — (segue o /admin) |

## 4. Decisão do motor da Vi (resolvida — D-045)

Modelo de "porta trocável"; a escolha inicial define custo e privacidade:

| Opção | Custo | Privacidade | Qualidade pt-BR |
|---|---|---|---|
| **Google Gemini Flash** | **Grátis** (1.500 req/dia, sem cartão) | ⚠️ termos do free tier **treinam** com os prompts | Boa |
| **Groq (Llama 3.3 70B)** | **Grátis** (1.000 req/dia) | Não treina | Razoável (abaixo dos outros) |
| **Claude Haiku** ✅ | Barato (~centavos/conversa), **não grátis** | **Não treina**; melhor postura de dados | Excelente |

O detalhe crítico: a Vi vê **dados de suporte do usuário**. O free tier do
Gemini treinar com os prompts é um risco de privacidade/LGPD que não
combina com uma central de suporte.

**Escolhido (D-045): Claude Haiku 4.5** (`claude-haiku-4-5`) — melhor
pt-BR, não treina com os dados, custo de centavos. A porta de IA
(`_shared/assistant.ts`) tem dois adapters por env `ASSISTANT_PROVIDER`:
- **`local` (padrão)** — recuperação sobre `faq_articles`, sem chamada
  externa; roda sem chave e é o default até chegar a chave da Anthropic.
- **`claude`** — Anthropic Messages API, ativado com o secret
  `ANTHROPIC_API_KEY` (pendente do David — lembrete em docs/07 #23).
