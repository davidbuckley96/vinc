import { useQuery } from '@tanstack/react-query';

import { fetchMyAgenda } from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { getMockCommitments, type AgendaCommitment } from './mock';

/**
 * The user's real agenda (gigs they will work on + gigs they posted),
 * mapped to the calendar's commitment shape. Demo mode falls back to
 * mock data; signed-out users have an empty agenda.
 */
export function useMyAgenda() {
  const { status, session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: ['agenda', userId ?? 'anonymous'],
    queryFn: async (): Promise<AgendaCommitment[]> => {
      if (!supabase) return getMockCommitments(new Date());
      if (!userId) return [];
      const entries = await fetchMyAgenda(supabase, userId);
      return entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        role: entry.role,
        startsAt: new Date(entry.startsAt),
        endsAt: new Date(entry.endsAt),
        priceCents: entry.priceCents,
        kind: entry.kind,
      }));
    },
    enabled: status !== 'loading',
  });
}
