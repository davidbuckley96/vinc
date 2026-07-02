/**
 * Temporary mock agenda data, used until auth + Supabase land (Fase 1).
 * Shapes mirror the future API types so screens won't change when real
 * data arrives.
 */

import { addDays } from './dates';

export interface AgendaCommitment {
  id: string;
  title: string;
  /** 'worker' = serviço que vou prestar; 'poster' = vaga que anunciei. */
  role: 'worker' | 'poster';
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  counterpartRating?: number;
}

function at(date: Date, hour: number): Date {
  const copy = new Date(date);
  copy.setHours(hour, 0, 0, 0);
  return copy;
}

export function getMockCommitments(today: Date): AgendaCommitment[] {
  return [
    {
      id: '1',
      title: 'Faxina — Casa da Ana',
      role: 'worker',
      startsAt: at(today, 14),
      endsAt: at(today, 17),
      priceCents: 12000,
      counterpartRating: 4.9,
    },
    {
      id: '2',
      title: 'Babá — 2 crianças',
      role: 'worker',
      startsAt: at(addDays(today, 1), 15),
      endsAt: at(addDays(today, 1), 22),
      priceCents: 16000,
      counterpartRating: 5,
    },
    {
      id: '3',
      title: 'Garçom para festa (minha vaga)',
      role: 'poster',
      startsAt: at(addDays(today, 3), 18),
      endsAt: at(addDays(today, 3), 23),
      priceCents: 20000,
    },
  ];
}
