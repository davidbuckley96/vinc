import type { LedgerEntry } from '@vinc/api';

export const ENTRY_LABELS: Record<LedgerEntry['type'], string> = {
  escrow_release: 'pagamento recebido',
  escrow_hold: 'valor reservado',
  fee: 'taxa da plataforma',
  fine: 'multa',
  refund: 'reembolso',
  withdrawal: 'saque',
};

/** "multa" only makes sense for who pays it; who receives sees this. */
export function entryLabel(entry: Pick<LedgerEntry, 'type' | 'amountCents'>): string {
  if (entry.type === 'fine' && entry.amountCents > 0) return 'compensação por cancelamento';
  return ENTRY_LABELS[entry.type];
}

function stripTime(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayDistance(iso: string): number {
  const target = stripTime(new Date(iso)).getTime();
  const today = stripTime(new Date()).getTime();
  return Math.round((target - today) / 86_400_000);
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

/** Statement group header: HOJE / ONTEM / full date. */
export function dayLabel(iso: string): string {
  const distance = dayDistance(iso);
  if (distance === 0) return 'HOJE';
  if (distance === -1) return 'ONTEM';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(iso))
    .toUpperCase();
}

/** "libera hoje" / "libera amanhã" / "libera sex., 10". */
export function releaseLabel(releasesAtIso: string): string {
  const distance = dayDistance(releasesAtIso);
  if (distance <= 0) return 'libera hoje';
  if (distance === 1) return 'libera amanhã';
  return `libera ${shortDate(releasesAtIso)}`;
}

/** "liberado hoje" / "liberado ontem" / "recebido seg., 29". */
export function receivedLabel(iso: string, released: boolean): string {
  const verb = released ? 'liberado' : 'recebido';
  const distance = dayDistance(iso);
  if (distance === 0) return `${verb} hoje`;
  if (distance === -1) return `${verb} ontem`;
  return `${verb} ${shortDate(iso)}`;
}

/** "cobrada hoje" / "cobrada ontem" / "cobrada seg., 29" — debits (fine). */
export function chargedLabel(iso: string): string {
  const distance = dayDistance(iso);
  if (distance === 0) return 'cobrada hoje';
  if (distance === -1) return 'cobrada ontem';
  return `cobrada ${shortDate(iso)}`;
}
