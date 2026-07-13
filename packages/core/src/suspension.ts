/**
 * Account suspension for repeat abuse (D-046). Pure helpers shared by the
 * app (friendly messages) and reused conceptually by the backend, which
 * owns the thresholds and enforcement.
 *
 * Thresholds (validated by David 2026-07-13 — revisit before launch):
 *   - 3 last-minute cancellations in 30 days, OR
 *   - 2 upheld reports (denúncias procedentes) in 30 days
 * → 7-day suspension from publishing and applying.
 */
export const SUSPENSION = {
  windowDays: 30,
  lateCancelThreshold: 3,
  upheldReportThreshold: 2,
  durationDays: 7,
  /** A cancellation this close (or closer) to the start counts as late. */
  lateCancelHours: 24,
} as const;

/** "até 20/07 às 14:00" — for messages; empty when no/invalid date. */
export function suspensionUntilLabel(untilIso?: string | null): string {
  if (!untilIso) return "";
  const date = new Date(untilIso);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return ` até ${formatted}`;
}
