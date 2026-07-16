/**
 * Demo-mode data for the admin panel (round 11, option A) — lets the
 * layout be previewed without a backend.
 */

import type { DisputeCase, DisputeQueueItem } from '@vinc/api';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/** 1×1 lilac PNG — stands in for evidence photos in demo mode. */
export const DEMO_PHOTO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4ueMdAAS9AnBwoCbGAAAAAElFTkSuQmCC';

export const DEMO_QUEUE: DisputeQueueItem[] = [
  {
    id: 'demo-dispute-1',
    gigId: 'demo-gig-d1',
    openerId: 'demo-ana',
    kind: 'pre_release',
    reason:
      'Metade dos cômodos ficou sem limpar e o banheiro nem foi tocado. Mandei fotos de como ficou.',
    status: 'open',
    refundCents: null,
    resolutionNote: null,
    workerResponse: null,
    workerRespondedAt: null,
    createdAt: hoursAgo(3),
    resolvedAt: null,
    gigTitle: 'Faxina apartamento 60m²',
    priceCents: 12000,
    startsAt: hoursAgo(7),
    endsAt: hoursAgo(4),
    gigStatus: 'disputed',
    posterId: 'demo-ana',
    posterName: 'Ana Souza',
    workerId: 'demo-beto',
    workerName: 'Beto Lima',
  },
  {
    id: 'demo-dispute-2',
    gigId: 'demo-gig-d2',
    openerId: 'demo-paulo',
    kind: 'post_release',
    reason:
      'Depois da festa percebi que duas travessas do buffet sumiram. Só pode ter sido durante o serviço.',
    status: 'open',
    refundCents: null,
    resolutionNote: null,
    workerResponse: null,
    workerRespondedAt: null,
    createdAt: hoursAgo(26),
    resolvedAt: null,
    gigTitle: 'Garçom para festa',
    priceCents: 20000,
    startsAt: hoursAgo(50),
    endsAt: hoursAgo(45),
    gigStatus: 'completed',
    posterId: 'demo-paulo',
    posterName: 'Paulo Dias',
    workerId: 'demo-carla',
    workerName: 'Carla Costa',
  },
  {
    id: 'demo-dispute-3',
    gigId: 'demo-gig-d3',
    openerId: 'demo-marta',
    kind: 'pre_release',
    reason: 'A babá saiu uma hora antes do combinado e as crianças ficaram sozinhas.',
    status: 'resolved',
    refundCents: 4000,
    resolutionNote: 'Saída antecipada confirmada pela conversa; reembolso proporcional.',
    workerResponse: null,
    workerRespondedAt: null,
    createdAt: hoursAgo(30),
    resolvedAt: hoursAgo(20),
    gigTitle: 'Babá — 2 crianças',
    priceCents: 16000,
    startsAt: hoursAgo(55),
    endsAt: hoursAgo(48),
    gigStatus: 'completed',
    posterId: 'demo-marta',
    posterName: 'Marta Reis',
    workerId: 'demo-denise',
    workerName: 'Denise Rocha',
  },
];

export const DEMO_CASES: Record<string, DisputeCase> = {
  'demo-dispute-1': {
    disputePhotoUrls: [DEMO_PHOTO, DEMO_PHOTO],
    completionReport: 'Limpei todos os cômodos e deixei o lixo na lixeira do prédio.',
    completionReportedAt: hoursAgo(3.7),
    completionPhotoUrls: [DEMO_PHOTO, DEMO_PHOTO, DEMO_PHOTO],
    messages: [
      { senderId: 'demo-beto', body: 'Cheguei', createdAt: hoursAgo(6.9) },
      { senderId: 'demo-ana', body: 'A chave está com o porteiro', createdAt: hoursAgo(6.8) },
      { senderId: 'demo-beto', body: 'Terminando por aqui 👍', createdAt: hoursAgo(4.1) },
    ],
    checkinDone: true,
  },
  'demo-dispute-2': {
    disputePhotoUrls: [],
    completionReport: null,
    completionReportedAt: null,
    completionPhotoUrls: [],
    messages: [
      { senderId: 'demo-carla', body: 'Estou chegando', createdAt: hoursAgo(50) },
      { senderId: 'demo-paulo', body: 'Entrada de serviço, por favor', createdAt: hoursAgo(49.9) },
    ],
    checkinDone: true,
  },
  'demo-dispute-3': {
    disputePhotoUrls: [],
    completionReport: null,
    completionReportedAt: null,
    completionPhotoUrls: [],
    messages: [
      { senderId: 'demo-marta', body: 'Tudo bem por aí?', createdAt: hoursAgo(52) },
      { senderId: 'demo-denise', body: 'Tudo tranquilo!', createdAt: hoursAgo(51) },
    ],
    checkinDone: true,
  },
};
