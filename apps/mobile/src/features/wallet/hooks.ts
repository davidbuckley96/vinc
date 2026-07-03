import { useQuery } from '@tanstack/react-query';

import { fetchWallet, type Wallet } from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_WALLET } from './demo';

export function useWallet() {
  const { status, session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: ['wallet', userId ?? 'anonymous'],
    queryFn: async (): Promise<Wallet> => {
      if (!supabase) return DEMO_WALLET;
      if (!userId) return { balanceCents: 0, pendingCents: 0, entries: [] };
      return fetchWallet(supabase, userId);
    },
    enabled: status !== 'loading',
  });
}
