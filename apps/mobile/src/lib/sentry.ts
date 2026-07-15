import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Observabilidade do app (docs/14 · F-08, D-069). Captura crashes e exceções e
 * manda pro Sentry. Sem DSN configurado, tudo vira no-op. Privacidade (LGPD):
 * o `beforeSend` remove CPF e e-mail antes de enviar — o Sentry é pra erro,
 * não pra dado pessoal. Trações/performance desligadas (só erros por ora).
 */

const DSN = (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ?? '';

const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function scrub(text: string): string {
  return text.replace(CPF, '[cpf]').replace(EMAIL, '[email]');
}

/** Deep-scrubs strings in the event (message, exception values). */
function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Never send user identifiers/PII to Sentry.
  delete event.user;
  if (event.message) event.message = scrub(event.message);
  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = scrub(value.value);
  }
  if (Array.isArray(event.breadcrumbs)) {
    for (const crumb of event.breadcrumbs) {
      if (typeof crumb.message === 'string') crumb.message = scrub(crumb.message);
    }
  }
  return event;
}

/** Init once, as early as possible. Safe to call when there's no DSN. */
export function initSentry(): void {
  if (!DSN) return;
  try {
    Sentry.init({
      dsn: DSN,
      environment: __DEV__ ? 'development' : 'production',
      // We handle PII removal ourselves; don't let the SDK attach it.
      sendDefaultPii: false,
      // Errors only for now — no performance tracing.
      tracesSampleRate: 0,
      beforeSend: (event) => scrubEvent(event),
    });
  } catch {
    // Observability must never break app startup.
  }
}

export { Sentry };
