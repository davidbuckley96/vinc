import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  applyGig,
  applyRegion,
  cancelGig,
  createGig,
  decideCandidacy,
  deleteGig,
  fetchCandidates,
  fetchCategories,
  fetchGigById,
  fetchMyCandidacy,
  fetchOpenGigs,
  hasPriorityForPeriod,
  updateGig,
  type ApplyGigResult,
  type CancelGigResult,
  type Candidate,
  type CreateGigResult,
  type DecideCandidacyResult,
  type DeleteGigResult,
  type MyCandidacyStatus,
  type RegionFilter,
  type TimeSlotFilter,
  type UpdateGigResult,
} from '@vinc/api';
import type { GigDraft } from '@vinc/core';

import { supabase } from '@/lib/supabase';

import { useSession } from '@/features/auth/session-context';

import { DEMO_CANDIDATES, DEMO_CATEGORIES, DEMO_GIGS } from './demo';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => (supabase ? fetchCategories(supabase) : Promise.resolve(DEMO_CATEGORIES)),
    staleTime: 1000 * 60 * 60,
  });
}

export function useOpenGigs(categoryId?: string, slot?: TimeSlotFilter, region?: RegionFilter) {
  return useQuery({
    queryKey: [
      'gigs',
      'open',
      categoryId ?? 'all',
      slot?.startsAt ?? '-',
      slot?.endsAt ?? '-',
      region ? `${region.lat.toFixed(4)},${region.lng.toFixed(4)},${region.radiusKm}` : '-',
    ],
    queryFn: () => {
      if (supabase) return fetchOpenGigs(supabase, { categoryId, slot, region });
      let gigs = categoryId
        ? DEMO_GIGS.filter((gig) => gig.categoryId === categoryId)
        : DEMO_GIGS;
      if (slot) {
        gigs = gigs.filter((gig) => gig.startsAt < slot.endsAt && gig.endsAt > slot.startsAt);
      }
      // Same region rule as the backend path (D-029).
      if (region) gigs = applyRegion(gigs, region);
      return Promise.resolve(gigs);
    },
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
      if (result === 'applied' || result === 'already_applied' || result === 'not_available') {
        queryClient.invalidateQueries({ queryKey: ['gigs'] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
        queryClient.invalidateQueries({ queryKey: ['candidacy'] });
      }
    },
  });
}

/** Anonymized candidates of an own open gig (poster side — D-024). */
export function useCandidates(gigId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['candidates', gigId],
    queryFn: () =>
      supabase ? fetchCandidates(supabase, gigId) : Promise.resolve(DEMO_CANDIDATES),
    enabled,
  });
}

export function useDecideCandidacy(gigId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      candidacyId: string;
      action: 'choose' | 'refuse';
    }): Promise<DecideCandidacyResult> => {
      if (!supabase) return input.action === 'choose' ? 'chosen' : 'refused'; // demo
      return decideCandidacy(supabase, input.candidacyId, input.action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', gigId] });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });
}

/** Whether the caller has priority (D-034) for a gig's period. */
export function useMyPriority(gigId: string, startsAt?: string, endsAt?: string) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['priority', gigId, userId ?? 'anonymous'],
    queryFn: async (): Promise<boolean> => {
      if (!supabase || !userId || !startsAt || !endsAt) return false;
      return hasPriorityForPeriod(supabase, userId, startsAt, endsAt);
    },
    enabled: Boolean(startsAt && endsAt),
  });
}

/** The signed-in worker's own candidacy for a gig (state on gig detail). */
export function useMyCandidacy(gigId: string) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['candidacy', gigId, userId ?? 'anonymous'],
    queryFn: (): Promise<MyCandidacyStatus | null> => {
      if (!supabase || !userId) return Promise.resolve(null);
      return fetchMyCandidacy(supabase, gigId, userId);
    },
  });
}

export type { Candidate };

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

export function useCancelGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gigId: string): Promise<CancelGigResult> => {
      if (!supabase) return 'cancelled'; // demo mode: pretend success
      return cancelGig(supabase, gigId);
    },
    onSuccess: (result) => {
      if (result === 'cancelled') {
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
