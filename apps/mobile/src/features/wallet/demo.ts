import type { Wallet } from '@vinc/api';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 30, 0, 0);
  return date.toISOString();
}

export const DEMO_WALLET: Wallet = {
  balanceCents: 31000,
  pendingCents: 15000,
  entries: [
    {
      id: 'w1',
      type: 'escrow_release',
      amountCents: 16000,
      gigId: '2',
      gigTitle: 'Babá — 2 crianças',
      createdAt: daysAgo(0),
    },
    {
      id: 'w2',
      type: 'escrow_release',
      amountCents: 15000,
      gigId: '1',
      gigTitle: 'Faxina — Casa da Ana',
      createdAt: daysAgo(1),
    },
    {
      id: 'w3',
      type: 'escrow_hold',
      amountCents: -20000,
      gigId: '3',
      gigTitle: 'Garçom para festa',
      createdAt: daysAgo(1),
    },
  ],
};
