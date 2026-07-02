import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  acceptGig,
  createGig,
  fetchCategories,
  fetchGigById,
  fetchOpenGigs,
  type AcceptGigResult,
} from '@vinc/api';
import type { GigDraft } from '@vinc/core';

import { supabase } from '@/lib/supabase';

import { DEMO_CATEGORIES, DEMO_GIGS } from './demo';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => (supabase ? fetchCategories(supabase) : Promise.resolve(DEMO_CATEGORIES)),
    staleTime: 1000 * 60 * 60,
  });
}

export function useOpenGigs(categoryId?: string) {
  return useQuery({
    queryKey: ['gigs', 'open', categoryId ?? 'all'],
    queryFn: () =>
      supabase
        ? fetchOpenGigs(supabase, { categoryId })
        : Promise.resolve(
            categoryId ? DEMO_GIGS.filter((gig) => gig.categoryId === categoryId) : DEMO_GIGS,
          ),
  });
}

export function useGig(gigId: string) {
  return useQuery({
    queryKey: ['gigs', 'detail', gigId],
    queryFn: () =>
      supabase
        ? fetchGigById(supabase, gigId)
        : Promise.resolve(DEMO_GIGS.find((gig) => gig.id === gigId) ?? null),
  });
}

export function useAcceptGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gigId: string): Promise<AcceptGigResult> => {
      if (!supabase) return 'accepted'; // demo mode: pretend success
      return acceptGig(supabase, gigId);
    },
    onSuccess: (result) => {
      if (result === 'accepted' || result === 'already_taken') {
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
    },
  });
}

export function useCreateGig(posterId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: GigDraft) => {
      if (!supabase) return; // demo mode: pretend success
      if (!posterId) throw new Error('not_signed_in');
      await createGig(supabase, posterId, draft);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gigs'] }),
  });
}
