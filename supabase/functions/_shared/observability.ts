// Observabilidade das Edge Functions (docs/14 · F-08) — envia erros pro Sentry
// SEM depender de SDK: monta o "envelope" e faz um POST no endpoint de ingestão
// derivado do SENTRY_DSN. Se não houver DSN configurado, tudo vira no-op (o
// backend segue funcionando). NUNCA deixa a observabilidade quebrar a função.
//
// Privacidade (LGPD): antes de enviar, remove CPF e e-mail de mensagens/stack.
// O Sentry é pra rastrear erro, não pra guardar dado pessoal.

const DSN = Deno.env.get("SENTRY_DSN") ?? "";
const ENV = Deno.env.get("SENTRY_ENVIRONMENT") ?? "production";

interface Dsn {
  key: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): Dsn | null {
  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!m) return null;
  return { key: m[1], host: m[2], projectId: m[3] };
}

const PARSED = parseDsn(DSN);

// CPF (11 dígitos ou formatado) e e-mail — os dados sensíveis mais prováveis de
// vazar num stack/mensagem. Endereço exato não costuma aparecer em erro.
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function scrub(text: string): string {
  return text.replace(CPF, "[cpf]").replace(EMAIL, "[email]");
}

/**
 * Reporta um erro pro Sentry. Best-effort: qualquer falha aqui é engolida.
 * `extra` deve conter só IDs/metadados — nunca dado pessoal.
 */
export async function reportError(
  err: unknown,
  context: { fn: string; extra?: Record<string, unknown> },
): Promise<void> {
  if (!PARSED) return; // observabilidade desligada (sem DSN)
  try {
    const now = new Date().toISOString();
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const name = err instanceof Error ? err.name : "Error";
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? err.stack : message;
    const event = {
      event_id: eventId,
      timestamp: now,
      platform: "node",
      level: "error",
      logger: context.fn,
      environment: ENV,
      server_name: context.fn,
      tags: { function: context.fn },
      extra: context.extra ?? {},
      exception: {
        values: [{ type: name, value: scrub(message), stacktrace: { frames: [] } }],
      },
      message: { formatted: scrub(stack) },
    };
    const envelope =
      JSON.stringify({ event_id: eventId, dsn: DSN, sent_at: now }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event) +
      "\n";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    await fetch(`https://${PARSED.host}/api/${PARSED.projectId}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${PARSED.key}, sentry_client=vinc-edge/1.0`,
      },
      body: envelope,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    // Observabilidade nunca derruba a função.
  }
}

/**
 * Envolve um handler de Deno.serve: qualquer exceção não tratada é reportada ao
 * Sentry e vira um 500 limpo, em vez de um erro opaco do runtime. O corpo do
 * handler continua responsável pelos erros de negócio (respostas 4xx normais).
 */
export function withObservability(
  fn: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (err) {
      await reportError(err, { fn });
      return new Response(JSON.stringify({ code: "error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
