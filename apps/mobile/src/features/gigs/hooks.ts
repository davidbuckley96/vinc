import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyGig,
  createGig,
  deleteGig,
  fetchCategories,
  fetchGigById,
  fetchOpenGigs,
  updateGig,
  type ApplyGigResult,
  type CreateGigResult,
  type DeleteGigResult,
  type UpdateGigResult,
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

export function useDeleteGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gigId: string): Promise<DeleteGigResult> => {
      if (!supabase) return 'deleted'; // demo mode: pretend success
      return deleteGig(supabase, gigId);
    },
    onSuccess: (result) => {
      if (result === 'deleted') {
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      }
    },
  });
}

export function useUpdateGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { gigId: string; draft: GigDraft }): Promise<UpdateGigResult> => {
      if (!supabase) return 'updated'; // demo mode: pretend success
      return updateGig(supabase, input.gigId, input.draft);
    },
    onSuccess: (result) => {
      if (result === 'updated') {
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
