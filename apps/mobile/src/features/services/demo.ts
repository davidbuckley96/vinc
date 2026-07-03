import type { ServiceDetail } from '@vinc/api';

function inDays(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** Demo-mode service details, keyed by the mock agenda commitment ids. */
export const DEMO_SERVICES: Record<string, ServiceDetail> = {
  '1': {
    id: '1',
    title: 'Faxina — Casa da Ana',
    description: 'Limpeza completa do apartamento, produtos fornecidos.',
    status: 'accepted',
    role: 'worker',
    startsAt: inDays(0, 14),
    endsAt: inDays(0, 17),
    priceCents: 12000,
    address: 'Rua das Flores, 100',
    counterpartId: 'demo-ana',
    counterpartName: 'Ana Souza',
  },
  '2': {
    id: '2',
    title: 'Babá — 2 crianças',
    description: 'Crianças de 4 e 7 anos, jantar incluído.',
    status: 'accepted',
    role: 'worker',
    startsAt: inDays(1, 15),
    endsAt: inDays(1, 22),
    priceCents: 16000,
    address: 'Av. Central, 45',
    counterpartId: 'demo-ana',
    counterpartName: 'Ana Souza',
  },
  '3': {
    id: '3',
    title: 'Garçom para festa (minha vaga)',
    description: 'Festa para 40 pessoas.',
    status: 'awaiting_confirmation',
    role: 'poster',
    startsAt: inDays(3, 18),
    endsAt: inDays(3, 23),
    priceCents: 20000,
    address: 'Salão Jardim América',
    counterpartId: 'demo-paulo',
    counterpartName: 'Paulo Dias',
  },
};
