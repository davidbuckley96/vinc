import type { Ionicons } from '@expo/vector-icons';

import type { NotificationType } from '@vinc/api';

interface NotificationPresentation {
  icon: keyof typeof Ionicons.glyphMap;
  text: (gigTitle: string) => string;
}

/** pt-BR text per event type (round 12, option A) — built in the app. */
export const NOTIFICATION_PRESENTATIONS: Record<NotificationType, NotificationPresentation> = {
  new_candidate: {
    icon: 'person-add',
    text: (title) => `Novo candidato em "${title}".`,
  },
  chosen: {
    icon: 'trophy',
    text: (title) => `Você foi escolhido para "${title}"! 🎉`,
  },
  not_chosen: {
    icon: 'people',
    text: (title) => `Outra pessoa foi escolhida para "${title}". Você segue livre para outras vagas.`,
  },
  service_started: {
    icon: 'play-circle',
    text: (title) => `O serviço "${title}" começou.`,
  },
  service_completed: {
    icon: 'flag',
    text: (title) => `"${title}" foi marcado como concluído — confirme a conclusão.`,
  },
  payment_released: {
    icon: 'cash',
    text: (title) => `Pagamento de "${title}" liberado na sua carteira.`,
  },
  dispute_opened: {
    icon: 'shield-half',
    text: (title) => `O anunciante contestou "${title}". O pagamento fica congelado durante a análise.`,
  },
  dispute_resolved: {
    icon: 'shield-checkmark',
    text: (title) => `A contestação de "${title}" foi resolvida — veja a decisão.`,
  },
  cancelled_by_poster: {
    icon: 'close-circle',
    text: (title) =>
      `O anunciante cancelou "${title}". A compensação entra na sua carteira e você tem prioridade em vagas nesse mesmo horário.`,
  },
  cancelled_by_worker: {
    icon: 'close-circle',
    text: (title) => `O prestador cancelou "${title}". Reembolso e compensação na sua carteira.`,
  },
  gig_expired: {
    icon: 'time',
    text: (title) => `"${title}" expirou sem prestador — o valor voltou para a sua carteira.`,
  },
};

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "HOJE" / "ONTEM" / "SEX, 4". */
export function dayGroupLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays <= 0) return 'HOJE';
  if (diffDays === 1) return 'ONTEM';
  return `${WEEKDAYS[date.getDay()]!.toUpperCase()}, ${date.getDate()}`;
}

/** "há 5 min" / "há 2h" / "18:40". */
export function timeLabel(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return minutes < 2 ? 'agora' : `há ${minutes} min`;
  if (minutes < 24 * 60) return `há ${Math.round(minutes / 60)}h`;
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
