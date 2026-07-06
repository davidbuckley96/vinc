import type { GigMessage } from '@vinc/api';

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** Demo conversation for service '6' (poster "me" × João Pedro). */
export const DEMO_MESSAGES: GigMessage[] = [
  {
    id: 'm1',
    gigId: '6',
    senderId: 'demo-joao',
    body: 'Oi! Qual o melhor lugar para estacionar aí?',
    createdAt: minutesAgo(65),
  },
  {
    id: 'm2',
    gigId: '6',
    senderId: 'demo-user',
    body: 'Tem vaga na rua de trás, do lado do mercado.',
    createdAt: minutesAgo(62),
  },
  {
    id: 'm3',
    gigId: '6',
    senderId: 'demo-joao',
    body: 'Perfeito. Levo os equipamentos pela entrada principal?',
    createdAt: minutesAgo(58),
  },
  {
    id: 'm4',
    gigId: '6',
    senderId: 'demo-user',
    body: 'Sim! Te espero na recepção 👍',
    createdAt: minutesAgo(55),
  },
];
