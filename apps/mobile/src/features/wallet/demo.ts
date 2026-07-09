import { buildWallet, type LedgerEntry, type PayoutAccount, type Wallet } from '@vinc/api';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 30, 0, 0);
  return date.toISOString();
}

/** Newest first, like the real query. */
const DEMO_ENTRIES: LedgerEntry[] = [
  {
    id: 'w1',
    type: 'fine',
    amountCents: 2000,
    gigId: null,
    gigTitle: 'DJ para aniversário',
    createdAt: daysAgo(1),
  },
  {
    id: 'w2',
    type: 'escrow_release',
    amountCents: 16000,
    gigId: '2',
    gigTitle: 'Babá — 2 crianças',
    createdAt: daysAgo(2),
  },
  {
    id: 'w3',
    type: 'escrow_release',
    amountCents: 5000,
    gigId: null,
    gigTitle: 'Cuidados com idosa',
    createdAt: daysAgo(6),
  },
  {
    id: 'w4',
    type: 'escrow_release',
    amountCents: 15000,
    gigId: '1',
    gigTitle: 'Faxina — Casa da Ana',
    createdAt: daysAgo(9),
  },
  {
    id: 'w6',
    type: 'fee',
    amountCents: -500,
    gigId: '5',
    gigTitle: 'Passear com cachorro (minha vaga)',
    createdAt: daysAgo(10),
  },
  {
    id: 'w7',
    type: 'withdrawal',
    amountCents: -12000,
    gigId: null,
    gigTitle: null,
    createdAt: daysAgo(12),
  },
  {
    id: 'w8',
    type: 'escrow_release',
    amountCents: 12000,
    gigId: null,
    gigTitle: 'Jardinagem — quintal',
    createdAt: daysAgo(20),
  },
];

export function demoWallet(): Wallet {
  return buildWallet(DEMO_ENTRIES, new Date());
}

export const DEMO_PAYOUT_ACCOUNT: PayoutAccount = {
  pixKeyType: 'email',
  pixKey: 'maria@email.com',
  holderCpf: '52998224725',
  status: 'pending',
};
