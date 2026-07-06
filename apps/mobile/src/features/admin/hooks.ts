import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDisputeCase,
  fetchDisputeQueue,
  fetchIsAdmin,
  fetchProfileStats,
  resolveDispute,
  type DisputeCase,
  type DisputeQueueItem,
  type ProfileStats,
  type ResolveDisputeResult,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_CASES, DEMO_QUEUE } from './demo';

/** Panel access (docs/02 §6): profiles.is_admin; demo mode previews. */
export function useIsAdmin() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['admin', 'me', userId ?? 'anonymous'],
    queryFn: async (): Promise<boolean> => {
      if (!supabase) return true; // demo mode: preview the panel
      if (!userId) return false;
      return fetchIsAdmin(supabase, userId);
    },
  });
}

export function useDisputeQueue(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: async (): Promise<DisputeQueueItem[]> => {
      if (!supabase) return DEMO_QUEUE;
      return fetchDisputeQueue(supabase);
    },
    enabled,
  });
}

export function useDisputeCase(item: DisputeQueueItem | null) {
  return useQuery({
    queryKey: ['admin', 'case', item?.id ?? 'none'],
    queryFn: async (): Promise<DisputeCase | null> => {
      if (!item) return null;
      if (!supabase) return DEMO_CASES[item.id] ?? null;
      return fetchDisputeCase(supabase, item.id, item.gigId);
    },
    enabled: item !== null,
  });
}

/** Reputation shown next to each party in the case header. */
export function usePartyStats(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'party', userId ?? 'none'],
    queryFn: async (): Promise<ProfileStats | null> => {
      if (!supabase || !userId) return null;
      return fetchProfileStats(supabase, userId);
    },
    enabled: Boolean(userId),
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      disputeId: string;
      refundCents: number;
      note?: string;
    }): Promise<ResolveDisputeResult> => {
      if (!supabase) return 'resolved'; // demo mode: pretend success
      return resolveDispute(supabase, input.disputeId, input.refundCents, input.note);
    },
    onSuccess: (result) => {
      if (result === 'resolved') {
        queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      }
    },
  });
}
