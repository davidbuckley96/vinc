import type { ProfileStats, Review } from '@vinc/api';

export const DEMO_PROFILE_STATS: ProfileStats = {
  id: 'demo-user',
  name: 'Maria da Silva',
  avatarUrl: null,
  city: 'Aracaju, SE',
  avgRating: 4.9,
  reviewCount: 87,
  workerAvgRating: 4.9,
  workerReviewCount: 61,
  posterAvgRating: 4.7,
  posterReviewCount: 21,
  completedAsWorker: 64,
  completedAsPoster: 23,
};

export const DEMO_REVIEWS: Record<'worker' | 'poster', Review[]> = {
  worker: [
  {
    id: 'r1',
    rating: 5,
    comment: 'Muito caprichosa, super recomendo!',
    tags: ['Pontual', 'Caprichou no serviço'],
    reviewerName: 'Ana Souza',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    rating: 5,
    comment: null,
    tags: ['Educado e gentil', 'Boa comunicação'],
    reviewerName: 'Carlos Lima',
    createdAt: new Date().toISOString(),
  },
  ],
  poster: [
    {
      id: 'r3',
      rating: 5,
      comment: 'Local seguro e pagamento certinho.',
      tags: ['Pagou certinho', 'Instruções claras'],
      reviewerName: 'Paulo Dias',
      createdAt: new Date().toISOString(),
    },
  ],
};
