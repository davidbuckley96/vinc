/**
 * Demo-mode data (no Supabase configured): mirrors the seeded categories of
 * supabase/migrations/0001 and a few open gigs, so every screen can be
 * exercised without a backend.
 */

import type { Candidate, Category, GigDetail } from '@vinc/api';

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

export const DEMO_GIGS: GigDetail[] = [
  {
    id: 'demo-gig-1',
    title: 'Faxina apartamento 60m²',
    description: 'Limpeza completa, produtos fornecidos.',
    startsAt: inDays(1, 14),
    endsAt: inDays(1, 17),
    priceCents: 12000,
    area: 'Boa Vista, Recife',
    approxLat: -8.0605,
    approxLng: -34.8742,
    exactAddress: null,
    exactLat: null,
    exactLng: null,
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
    area: 'Centro, Recife',
    approxLat: -8.0551,
    approxLng: -34.8858,
    exactAddress: null,
    exactLat: null,
    exactLng: null,
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
    area: 'Centro, Recife',
    approxLat: -8.0497,
    approxLng: -34.8801,
    exactAddress: null,
    exactLat: null,
    exactLng: null,
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
    area: 'Jardim América, Recife',
    approxLat: -8.0445,
    approxLng: -34.8998,
    exactAddress: null,
    exactLat: null,
    exactLng: null,
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
    area: 'Madalena, Recife',
    approxLat: -8.0471,
    approxLng: -34.9014,
    exactAddress: 'Praça da Matriz, 10 — Madalena, Recife',
    exactLat: -8.0498,
    exactLng: -34.8987,
    categoryId: 'demo-outros',
    posterId: 'demo-user',
    posterName: 'Maria da Silva',
  },
];

/** Candidates of "my" open demo gig — mirrors round 8, option A. */
export const DEMO_CANDIDATES: Candidate[] = [
  {
    candidacyId: 'demo-cand-1',
    appliedAt: inDays(0, 9),
    firstName: 'Beto',
    avgRating: 4.9,
    reviewCount: 61,
    completedServices: 64,
    topTags: ['Pontual', 'Caprichou no serviço', 'Educado e gentil'],
    priority: true,
  },
  {
    candidacyId: 'demo-cand-2',
    appliedAt: inDays(0, 10),
    firstName: 'Carla',
    avgRating: 4.7,
    reviewCount: 23,
    completedServices: 25,
    topTags: ['Boa comunicação', 'Pontual'],
    priority: false,
  },
  {
    candidacyId: 'demo-cand-3',
    appliedAt: inDays(0, 11),
    firstName: 'Denise',
    avgRating: null,
    reviewCount: 0,
    completedServices: 0,
    topTags: [],
    priority: false,
  },
];
