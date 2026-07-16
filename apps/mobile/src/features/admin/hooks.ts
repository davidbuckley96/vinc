import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelGigOnBehalf,
  forceCompleteGig,
  fetchDisputeCase,
  fetchDisputeQueue,
  fetchIsAdmin,
  fetchProfileStats,
  fetchReports,
  fetchSupportTickets,
  fetchTicketThread,
  fetchUserContext,
  replyTicket,
  resolveDispute,
  resolveReport,
  resolveTicket,
  searchUsers,
  type DisputeCase,
  type DisputeQueueItem,
  type PanelActionResult,
  type ProfileStats,
  type ReportItem,
  type DisputeOutcome,
  type ResolveDisputeResult,
  type TicketItem,
  type TicketMessage,
  type UserContext,
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
      refundCents?: number;
      outcome?: DisputeOutcome;
      note?: string;
    }): Promise<ResolveDisputeResult> => {
      if (!supabase) return 'resolved'; // demo mode: pretend success
      return resolveDispute(supabase, input.disputeId, {
        refundCents: input.refundCents,
        outcome: input.outcome,
        note: input.note,
      });
    },
    onSuccess: (result) => {
      if (result === 'resolved') {
        queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      }
    },
  });
}

// ------------------------------------------------------- support panel (S4)
export function useReports(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async (): Promise<ReportItem[]> => {
      if (!supabase) return [];
      return fetchReports(supabase);
    },
    enabled,
  });
}

export function useSupportTickets(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: async (): Promise<TicketItem[]> => {
      if (!supabase) return [];
      return fetchSupportTickets(supabase);
    },
    enabled,
  });
}

export function useTicketThread(ticketId: string | null) {
  return useQuery({
    queryKey: ['admin', 'ticket-thread', ticketId ?? 'none'],
    queryFn: async (): Promise<TicketMessage[]> => {
      if (!supabase || !ticketId) return [];
      return fetchTicketThread(supabase, ticketId);
    },
    enabled: Boolean(ticketId),
    refetchInterval: 15_000,
  });
}

export function useUserContext(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'user-context', userId ?? 'none'],
    queryFn: async (): Promise<UserContext | null> => {
      if (!supabase || !userId) return null;
      return fetchUserContext(supabase, userId);
    },
    enabled: Boolean(userId),
  });
}

export function useUserSearch(term: string) {
  return useQuery({
    queryKey: ['admin', 'user-search', term],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      if (!supabase || term.trim().length < 2) return [];
      return searchUsers(supabase, term);
    },
    enabled: term.trim().length >= 2,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      reportId: string;
      decision: 'actioned' | 'dismissed';
      note?: string;
    }): Promise<PanelActionResult> => {
      if (!supabase) return 'ok';
      return resolveReport(supabase, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });
}

export function useReplyTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ticketId: string; replyBody: string }): Promise<PanelActionResult> => {
      if (!supabase) return 'ok';
      return replyTicket(supabase, input);
    },
    onSuccess: (_r, input) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-thread', input.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
  });
}

export function useResolveTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string): Promise<PanelActionResult> => {
      if (!supabase) return 'ok';
      return resolveTicket(supabase, ticketId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
  });
}

export function useCancelGigOnBehalf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { gigId: string; note?: string }): Promise<PanelActionResult> => {
      if (!supabase) return 'ok';
      return cancelGigOnBehalf(supabase, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'user-context'] }),
  });
}

export function useForceCompleteGig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { gigId: string; note?: string }): Promise<PanelActionResult> => {
      if (!supabase) return 'ok';
      return forceCompleteGig(supabase, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'user-context'] }),
  });
}
