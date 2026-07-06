/**
 * Demo-mode data (no Supabase configured): mirrors the seeded categories of
 * supabase/migrations/0001 and a few open gigs, so every screen can be
 * exercised without a backend.
 */

import type { Category, OpenGig } from '@vinc/api';

export const DEMO_CATEGORIES: Category[] = [
  { id: 'demo-domesticos', name: 'Serviços domésticos', icon: 'home' },
  { id: 'demo-saude', name: 'Saúde', icon: 'medkit' },
  { id: 'demo-entretenimento', name: 'Entretenimento', icon: 'musical-notes' },
  { id: 'demo-criancas', name: 'Cuidado de crianças', icon: 'happy' },
  { id: 'demo-eventos', name: 'Eventos', icon: 'restaurant' },
  { id: 'demo-outros', name: 'Outros', icon: 'ellipsis-horizontal' },
];

function inDays(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const DEMO_GIGS: OpenGig[] = [
  {
    id: 'demo-gig-1',
    title: 'Faxina apartamento 60m²',
    description: 'Limpeza completa, produtos fornecidos.',
    startsAt: inDays(1, 14),
    endsAt: inDays(1, 17),
    priceCents: 12000,
    address: 'Boa Vista',
    lat: -8.0632,
    lng: -34.8711,
    categoryId: 'demo-domesticos',
    posterId: 'demo-carlos',
    posterName: 'Carlos Lima',
  },
  {
    id: 'demo-gig-2',
    title: 'Babá para 2 crianças',
    description: 'Crianças de 4 e 7 anos, jantar incluído.',
    startsAt: inDays(1, 15),
    endsAt: inDays(1, 22),
    priceCents: 16000,
    address: 'Centro',
    lat: -8.0578,
    lng: -34.8829,
    categoryId: 'demo-criancas',
    posterId: 'demo-ana',
    posterName: 'Ana Souza',
  },
  {
    id: 'demo-gig-3',
    title: 'Cuidador de idoso (noite)',
    description: 'Acompanhamento noturno, experiência necessária.',
    startsAt: inDays(2, 19),
    endsAt: inDays(3, 7),
    priceCents: 28000,
    address: 'Centro',
    lat: -8.0525,
    lng: -34.877,
    categoryId: 'demo-saude',
    posterId: 'demo-marta',
    posterName: 'Marta Reis',
  },
  {
    id: 'demo-gig-4',
    title: 'Garçom para festa de aniversário',
    description: 'Festa para 40 pessoas, traje preto.',
    startsAt: inDays(3, 18),
    endsAt: inDays(3, 23),
    priceCents: 20000,
    address: 'Jardim América',
    lat: -8.0417,
    lng: -34.9026,
    categoryId: 'demo-eventos',
    posterId: 'demo-paulo',
    posterName: 'Paulo Dias',
  },
  // Mirrors DEMO_SERVICES['5'] (my open gig) so the edit screen works in
  // demo mode; being open, it also shows up in the search list.
  {
    id: '5',
    title: 'Passear com cachorro (minha vaga)',
    description: 'Passeio de 1 hora com cachorro dócil de porte médio.',
    startsAt: inDays(0, 18),
    endsAt: inDays(0, 19),
    priceCents: 5000,
    address: 'Praça da Matriz',
    lat: -8.0498,
    lng: -34.8987,
    categoryId: 'demo-outros',
    posterId: 'demo-user',
    posterName: 'Maria da Silva',
  },
];
