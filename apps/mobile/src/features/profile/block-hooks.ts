import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { blockUser, fetchBlockStatus, unblockUser, type BlockStatus } from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

export function useBlockStatus(otherId: string | null) {
  const { session } = useSession();
  const myId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['blocks', myId, otherId],
    queryFn: async (): Promise<BlockStatus> => {
      if (!supabase || !myId || !otherId) return { blockedByMe: false, blockedMe: false };
      return fetchBlockStatus(supabase, myId, otherId);
    },
  });
}

export function useToggleBlock(otherId: string | null) {
  const { session } = useSession();
  const myId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (block: boolean) => {
      if (!supabase || !myId || !otherId) return; // demo mode: pretend success
      if (block) await blockUser(supabase, myId, otherId);
      else await unblockUser(supabase, myId, otherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
}
