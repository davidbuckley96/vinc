import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buildWallet, fetchWallet, withdraw, type Wallet, type WithdrawResult } from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { demoWallet } from './demo';

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
