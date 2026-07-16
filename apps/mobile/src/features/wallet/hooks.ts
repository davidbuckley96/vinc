import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildWallet,
  fetchPayoutAccount,
  fetchWallet,
  fetchWorkerDebts,
  savePayoutAccount,
  withdraw,
  type PayoutAccount,
  type SavePayoutResult,
  type Wallet,
  type WithdrawResult,
  type WorkerDebt,
} from '@vinc/api';
import type { PixKeyType } from '@vinc/core';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_PAYOUT_ACCOUNT, demoWallet } from './demo';

export function useWallet() {
  const { status, session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: ['wallet', userId ?? 'anonymous'],
    queryFn: async (): Promise<Wallet> => {
      if (!supabase) return demoWallet();
      if (!userId) return buildWallet([], new Date());
      return fetchWallet(supabase, userId);
    },
    enabled: status !== 'loading',
  });
}

/** Worker no-show debts (D-071) — shown on the wallet, links to origin gigs. */
export function useWorkerDebts() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['worker-debts', userId ?? 'anonymous'],
    queryFn: async (): Promise<WorkerDebt[]> => {
      if (!supabase || !userId) return [];
      return fetchWorkerDebts(supabase, userId);
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<WithdrawResult> => {
      if (!supabase) return 'withdrawn'; // demo mode: pretend success
      return withdraw(supabase);
    },
    onSuccess: (result) => {
      if (result === 'withdrawn') {
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      }
    },
  });
}

/** The caller's payout destination (Fase 3.3 — D-035). */
export function usePayoutAccount() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['payout-account', userId ?? 'anonymous'],
    queryFn: async (): Promise<PayoutAccount | null> => {
      if (!supabase) return DEMO_PAYOUT_ACCOUNT;
      if (!userId) return null;
      return fetchPayoutAccount(supabase, userId);
    },
  });
}

export function useSavePayoutAccount() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async (input: {
      pixKeyType: PixKeyType;
      pixKey: string;
      holderCpf: string;
    }): Promise<SavePayoutResult> => {
      if (!supabase || !userId) return 'saved'; // demo mode: pretend success
      return savePayoutAccount(supabase, userId, input);
    },
    onSuccess: (result, input) => {
      if (result !== 'saved') return; // cpf_taken / cpf_banned: keep the form
      // Write the fresh account into the cache BEFORE any navigation:
      // the onboarding gate (D-038) reads this query and would bounce
      // the user back while a refetch is still in flight.
      queryClient.setQueryData<PayoutAccount>(['payout-account', userId ?? 'anonymous'], {
        pixKeyType: input.pixKeyType,
        pixKey: input.pixKey,
        holderCpf: input.holderCpf,
        status: 'pending',
      });
      queryClient.invalidateQueries({ queryKey: ['payout-account'] });
    },
  });
}
