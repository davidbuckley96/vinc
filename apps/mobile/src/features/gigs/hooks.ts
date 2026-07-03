import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyGig,
  createGig,
  fetchCategories,
  fetchGigById,
  fetchOpenGigs,
  type ApplyGigResult,
  type CreateGigResult,
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

export function useApplyGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gigId: string): Promise<ApplyGigResult> => {
      if (!supabase) return 'applied'; // demo mode: pretend success
      return applyGig(supabase, gigId);
    },
    onSuccess: (result) => {
      if (result === 'applied' || result === 'not_available') {
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
    },
  });
}

export function useCreateGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: GigDraft): Promise<CreateGigResult> => {
      if (!supabase) return 'created'; // demo mode: pretend success
      return createGig(supabase, draft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
