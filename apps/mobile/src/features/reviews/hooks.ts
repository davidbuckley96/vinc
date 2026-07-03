import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProfileStats,
  fetchRecentReviews,
  hasReviewed,
  submitReview,
  type ProfileStats,
  type Review,
  type ReviewInput,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_PROFILE_STATS, DEMO_REVIEWS } from './demo';

export function useHasReviewed(gigId: string) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['reviews', 'mine', gigId, userId],
    queryFn: async (): Promise<boolean> => {
      if (!supabase || !userId) return false;
      return hasReviewed(supabase, gigId, userId);
    },
  });
}

export function useSubmitReview() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      if (!supabase) return; // demo mode: pretend success
      if (!session) throw new Error('not_signed_in');
      await submitReview(supabase, session.user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useProfileStats(userId: string | null) {
  return useQuery({
    queryKey: ['profile', 'stats', userId],
    queryFn: async (): Promise<ProfileStats | null> => {
      if (!supabase) return DEMO_PROFILE_STATS;
      if (!userId) return null;
      return fetchProfileStats(supabase, userId);
    },
  });
}

export function useRecentReviews(userId: string | null) {
  return useQuery({
    queryKey: ['profile', 'reviews', userId],
    queryFn: async (): Promise<Review[]> => {
      if (!supabase) return DEMO_REVIEWS;
      if (!userId) return [];
      return fetchRecentReviews(supabase, userId);
    },
  });
}
