// Assistant PORT — a "Vi" (docs/09, fase S3 · D-045).
//
// Espelha o padrão da PaymentProvider: uma porta trocável por env, com um
// default que funciona sem chave e um adapter de LLM ligado por secret.
//   - 'local'  (default): recuperação sobre a FAQ (faq_articles), sem
//     chamada externa. Resolve o comum e escala quando não tem confiança.
//   - 'claude' (D-045): Claude Haiku 4.5 pela Anthropic Messages API,
//     ligado pelo secret ANTHROPIC_API_KEY. Melhor pt-BR, não treina.
// Selecionado pela env ASSISTANT_PROVIDER (default 'local').
//
// A Vi NUNCA executa ação sensível — só responde e, quando não dá conta,
// marca escalar=true para o ticket ir ao suporte humano no painel.

export interface FaqArticle {
  question: string;
  answer: string;
  category: string;
}

export interface AssistantTurn {
  sender: "user" | "ai" | "agent";
  body: string;
}

export interface AssistantInput {
  /** A última mensagem do usuário. */
  userMessage: string;
  /** Histórico da conversa (sem a última mensagem). */
  history: AssistantTurn[];
  /** Base de conhecimento (fonte única com os cards de FAQ). */
  faq: FaqArticle[];
  /** Resumo seguro do contexto do usuário (nunca dados de terceiros). */
  userContext?: string;
}

export interface AssistantReply {
  reply: string;
  /** true → o ticket vira waiting_support e vai para o humano. */
  escalate: boolean;
  confidence: "high" | "low";
}

export interface AssistantProvider {
  readonly name: string;
  answer(input: AssistantInput): Promise<AssistantReply>;
}

// ----------------------------------------------------------------- helpers

/** Remove acentos e baixa caixa — casamento robusto em pt-BR. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const STOPWORDS = new Set([
  "a", "o", "as", "os", "de", "do", "da", "dos", "das", "e", "em", "no", "na",
  "nos", "nas", "um", "uma", "para", "por", "com", "que", "se", "eu", "meu",
  "minha", "meus", "minhas", "como", "qual", "quais", "quando", "onde", "ao",
  "aos", "the", "of", "to", "is", "meu", "sou", "ter", "tem", "vou", "ja",
]);

function tokens(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Pediu explicitamente humano/atendente? Então escala na hora (docs/09). */
const HUMAN_PATTERNS = [
  "falar com alguem", "falar com uma pessoa", "atendente", "humano",
  "pessoa de verdade", "suporte de verdade", "equipe", "reclamacao",
  "reclamar", "nao resolveu", "nao me ajudou", "quero falar",
];

export function asksForHuman(message: string): boolean {
  const n = normalize(message);
  return HUMAN_PATTERNS.some((p) => n.includes(p));
}

/** Pontua cada artigo da FAQ pela sobreposição de termos com a pergunta. */
export function rankFaq(
  message: string,
  faq: FaqArticle[],
): { article: FaqArticle; score: number }[] {
  const qTerms = new Set(tokens(message));
  if (qTerms.size === 0) return [];
  return faq
    .map((article) => {
      const hay = tokens(`${article.question} ${article.answer}`);
      let hits = 0;
      const counted = new Set<string>();
      for (const t of hay) {
        if (qTerms.has(t) && !counted.has(t)) {
          counted.add(t);
          hits++;
        }
      }
      return { article, score: hits / qTerms.size };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// -------------------------------------------------------------- local port

const ESCALATION_LINE =
  "Vou te encaminhar para alguém da nossa equipe, que continua esse " +
  "atendimento por aqui mesmo. É só aguardar. 💜";

const local: AssistantProvider = {
  name: "local",
  // deno-lint-ignore require-await
  async answer(input) {
    if (asksForHuman(input.userMessage)) {
      return { reply: ESCALATION_LINE, escalate: true, confidence: "high" };
    }

    const ranked = rankFaq(input.userMessage, input.faq);
    const best = ranked[0];

    // Casamento forte com um artigo → responde com ele (alta confiança).
    if (best && best.score >= 0.34) {
      return { reply: best.article.answer, escalate: false, confidence: "high" };
    }

    // Casamento fraco → oferece o mais próximo, sem fingir certeza.
    if (best && best.score >= 0.17) {
      return {
        reply:
          `Acho que isto pode ajudar:\n\n${best.article.answer}\n\n` +
          "Se não era isso, me conta com outras palavras ou toque em " +
          '"Falar com o suporte" que a equipe te ajuda.',
        escalate: false,
        confidence: "low",
      };
    }

    // Sem casamento → escala para o humano, sem prender o usuário.
    return {
      reply:
        "Ainda estou aprendendo e não tenho certeza sobre isso. " +
        ESCALATION_LINE,
      escalate: true,
      confidence: "low",
    };
  },
};

// ------------------------------------------------------------- claude port

const SYSTEM_PROMPT = [
  "Você é a Vi, a assistente de suporte do Vinc — um app brasileiro de vagas",
  "de serviços por horário (\"bicos\"), onde pessoas anunciam vagas e",
  "prestadores se candidatam. Fale em português do Brasil, com frases curtas,",
  "simples e acolhedoras (o público tem baixa escolaridade). Use no máximo um",
  "emoji por resposta.",
  "",
  "Regras:",
  "- Responda SOMENTE com base na BASE DE CONHECIMENTO e no CONTEXTO DO USUÁRIO",
  "  abaixo. Nunca invente regras, valores ou prazos.",
  "- Você NÃO executa ações (cancelar vaga, liberar pagamento, sacar). Se o",
  "  usuário precisar disso, explique e encaminhe para a equipe.",
  "- Se não souber, ou se o usuário pedir uma pessoa/atendente, ou se o caso",
  "  for uma reclamação/disputa, encaminhe para o suporte humano.",
  "- Nunca revele dados de outras pessoas.",
  "",
  "Ao final da resposta, em uma linha isolada, escreva um marcador de controle:",
  "[[ESCALAR]] se o caso deve ir para um humano, ou [[OK]] se você resolveu.",
  "Esse marcador é removido antes de mostrar ao usuário.",
].join("\n");

function renderKnowledge(faq: FaqArticle[]): string {
  return faq
    .map((a) => `P: ${a.question}\nR: ${a.answer}`)
    .join("\n\n");
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

function toAnthropicMessages(input: AssistantInput): AnthropicMessage[] {
  const msgs: AnthropicMessage[] = [];
  for (const turn of input.history) {
    // 'agent' (humano) e 'ai' viram assistant; 'user' vira user.
    msgs.push({
      role: turn.sender === "user" ? "user" : "assistant",
      content: turn.body,
    });
  }
  msgs.push({ role: "user", content: input.userMessage });
  return msgs;
}

function createClaudeProvider(apiKey: string): AssistantProvider {
  return {
    name: "claude",
    async answer(input) {
      const systemBlocks = [
        SYSTEM_PROMPT,
        `\n\n=== BASE DE CONHECIMENTO ===\n${renderKnowledge(input.faq)}`,
        input.userContext
          ? `\n\n=== CONTEXTO DO USUÁRIO ===\n${input.userContext}`
          : "",
      ].join("");

      let res: Response;
      try {
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 600,
            system: systemBlocks,
            messages: toAnthropicMessages(input),
          }),
        });
      } catch (err) {
        console.error("[assistant:claude] network error", err);
        // Falha de rede → não deixa o usuário na mão: escala.
        return {
          reply: `Tive um problema técnico agora. ${ESCALATION_LINE}`,
          escalate: true,
          confidence: "low",
        };
      }

      if (!res.ok) {
        console.error("[assistant:claude] http", res.status, await res.text());
        return {
          reply: `Tive um problema técnico agora. ${ESCALATION_LINE}`,
          escalate: true,
          confidence: "low",
        };
      }

      const data = await res.json();
      const raw: string = (data.content ?? [])
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("")
        .trim();

      const escalate = /\[\[ESCALAR\]\]/i.test(raw);
      const reply = raw
        .replace(/\[\[ESCALAR\]\]/gi, "")
        .replace(/\[\[OK\]\]/gi, "")
        .trim();

      return {
        reply: reply || ESCALATION_LINE,
        escalate,
        confidence: escalate ? "low" : "high",
      };
    },
  };
}

// ---------------------------------------------------------------- selector

/** Selecionado por ASSISTANT_PROVIDER; default 'local' (funciona sem chave).
 * 'claude' exige o secret ANTHROPIC_API_KEY — sem ele, cai no local. */
export function getAssistantProvider(): AssistantProvider {
  const which = Deno.env.get("ASSISTANT_PROVIDER") ?? "local";
  if (which === "local") return local;
  if (which === "claude") {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) {
      console.warn("[assistant] ASSISTANT_PROVIDER=claude sem ANTHROPIC_API_KEY; usando local");
      return local;
    }
    return createClaudeProvider(key);
  }
  throw new Error(`unknown assistant provider: ${which}`);
}

export { local as localAssistant };
