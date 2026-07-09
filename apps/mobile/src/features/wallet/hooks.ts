import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  buildWallet,
  fetchPayoutAccount,
  fetchWallet,
  savePayoutAccount,
  withdraw,
  type PayoutAccount,
  type Wallet,
  type WithdrawResult,
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
    }): Promise<void> => {
      if (!supabase || !userId) return; // demo mode: pretend success
      await savePayoutAccount(supabase, userId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-account'] });
    },
  });
}
