import type { JobAlert, TimeBand } from '@vinc/api';

/** Sunday-first, matching Postgres extract(dow) (0=domingo). */
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const TIME_BANDS: { key: TimeBand; label: string; hint: string }[] = [
  { key: 'madrugada', label: 'Madrugada', hint: '0h–5h' },
  { key: 'manha', label: 'Manhã', hint: '6h–11h' },
  { key: 'tarde', label: 'Tarde', hint: '12h–17h' },
  { key: 'noite', label: 'Noite', hint: '18h–23h' },
];

const BAND_LABEL: Record<TimeBand, string> = {
  madrugada: 'Madrugada',
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

/** One-line description of an alert, e.g. "Seg, Qui · Tarde/Noite · Aracaju 10 km". */
export function alertSummary(alert: JobAlert): string {
  const days =
    alert.days.length === 0
      ? 'Todo dia'
      : [...alert.days].sort((a, b) => a - b).map((d) => WEEKDAYS_SHORT[d]).join(', ');
  const bands =
    alert.timeBands.length === 0
      ? 'qualquer hora'
      : alert.timeBands.map((b) => BAND_LABEL[b]).join('/');
  const where = alert.region ? `${alert.region.label} ${alert.region.radiusKm} km` : 'qualquer lugar';
  return `${days} · ${bands} · ${where}`;
}
