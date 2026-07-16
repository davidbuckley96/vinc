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
  fetchGigPayment,
  fetchMyCandidacy,
  fetchMyReportedGigIds,
  report,
  withdrawCandidacy,
  fetchOpenGigs,
  hasPriorityForPeriod,
  updateGig,
  type ApplyGigResult,
  type CancelGigResult,
  type Candidate,
  type CreateGigOutcome,
  type DecideCandidacyOutcome,
  type DeleteGigResult,
  type MyCandidacyStatus,
  type WithdrawCandidacyResult,
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

/** categoryIds: the selected category expanded to [parent, ...children] (D-041). */
export function useOpenGigs(categoryIds?: string[], slot?: TimeSlotFilter, region?: RegionFilter) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: [
      'gigs',
      'open',
      userId ?? 'anon',
      categoryIds?.join(',') ?? 'all',
      slot?.startsAt ?? '-',
      slot?.endsAt ?? '-',
      region ? `${region.lat.toFixed(4)},${region.lng.toFixed(4)},${region.radiusKm}` : '-',
    ],
    queryFn: () => {
      if (supabase)
        return fetchOpenGigs(supabase, {
          categoryIds,
          slot,
          region,
          excludePosterId: userId ?? undefined, // V-05: don't list my own gigs
        });
      let gigs = categoryIds && categoryIds.length > 0
        ? DEMO_GIGS.filter((gig) => categoryIds.includes(gig.categoryId))
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

/** Ids of gigs the current user reported — hidden from the list, apply blocked (B-23). */
export function useMyReportedGigs() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['gigs', 'reported', userId ?? 'anon'],
    queryFn: async (): Promise<string[]> => {
      if (!supabase || !userId) return [];
      return fetchMyReportedGigIds(supabase, userId);
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
    }): Promise<DecideCandidacyOutcome> => {
      if (!supabase) {
        return { code: input.action === 'choose' ? 'chosen' : 'refused' }; // demo
      }
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
    queryFn: async (): Promise<MyCandidacyStatus | null> => {
      if (!supabase || !userId) return null;
      const status = await fetchMyCandidacy(supabase, gigId, userId);
      // Withdrawn behaves like never applied (D-039): apply again freely.
      return status === 'withdrawn' ? null : status;
    },
  });
}

/** Withdraws a pending candidacy (D-039). */
export function useWithdrawCandidacy(gigId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<WithdrawCandidacyResult> => {
      if (!supabase) return 'withdrawn'; // demo mode: pretend success
      return withdrawCandidacy(supabase, gigId);
    },
    onSuccess: (result) => {
      if (result === 'withdrawn') {
        queryClient.invalidateQueries({ queryKey: ['candidacy', gigId] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
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
        // G-04 (docs/16): a tela do dono lê ['service', gigId] — sem isto o
        // endereço editado só atualizava ao reiniciar o app.
        queryClient.invalidateQueries({ queryKey: ['service'] });
      }
    },
  });
}

export function useCreateGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (draft: GigDraft): Promise<CreateGigOutcome> => {
      if (!supabase) return { code: 'created' }; // demo mode: pretend success
      return createGig(supabase, draft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * The gig's Pix charge (gateway mode — round 13, option B). While the
 * payment is pending, polls every 3s so the screen flips to "confirmed"
 * by itself the moment the webhook publishes the gig.
 */
export function useGigPayment(gigId: string) {
  return useQuery({
    queryKey: ['gig-payment', gigId],
    queryFn: async () => {
      if (!supabase) {
        // demo mode: a sample pending charge so the screen can be seen
        return {
          chargeId: 'demo-charge',
          status: 'pending' as const,
          totalCents: 5500,
          qrCode: '00020126580014BR.GOV.BCB.PIX-DEMO-0000000000',
          qrCodeBase64: null,
        };
      }
      return fetchGigPayment(supabase, gigId);
    },
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 3000 : false,
  });
}

/** Reports a gig for moderation with a chosen reason + detail (D-040/D-052). */
export function useReportGig(gigId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async (input: {
      category: string;
      reason: string;
    }): Promise<'reported' | 'already_reported' | 'error'> => {
      if (!supabase || !userId) return 'reported'; // demo mode: pretend
      return report(supabase, {
        targetType: 'gig',
        targetId: gigId,
        reporterId: userId,
        category: input.category,
        reason: input.reason,
      });
    },
    onSuccess: (result) => {
      // Refresh the reported set so the gig drops out of the list (B-23).
      if (result !== 'error') {
        queryClient.invalidateQueries({ queryKey: ['gigs', 'reported'] });
      }
    },
  });
}
