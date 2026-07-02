import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createGig, fetchCategories, fetchOpenGigs } from '@vinc/api';
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
