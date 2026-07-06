import type { AppNotification } from '@vinc/api';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/** Demo-mode notifications mirroring round 12, option A. */
export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'demo-n1',
    type: 'payment_released',
    gigId: '2',
    gigTitle: 'Babá — 2 crianças',
    readAt: null,
    createdAt: hoursAgo(2),
  },
  {
    id: 'demo-n2',
    type: 'new_candidate',
    gigId: '5',
    gigTitle: 'Passear com cachorro (minha vaga)',
    readAt: null,
    createdAt: hoursAgo(3),
  },
  {
    id: 'demo-n3',
    type: 'chosen',
    gigId: '1',
    gigTitle: 'Faxina — Casa da Ana',
    readAt: hoursAgo(20),
    createdAt: hoursAgo(26),
  },
  {
    id: 'demo-n4',
    type: 'service_completed',
    gigId: '3',
    gigTitle: 'Garçom para festa (minha vaga)',
    readAt: hoursAgo(20),
    createdAt: hoursAgo(30),
  },
];
