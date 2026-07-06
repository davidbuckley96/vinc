import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchServiceDetail,
  gigLifecycle,
  type LifecycleAction,
  type LifecycleResult,
  type ServiceDetail,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_SERVICES } from './demo';

export function useServiceDetail(gigId: string) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: ['service', gigId],
    queryFn: async (): Promise<ServiceDetail | null> => {
      if (!supabase) return DEMO_SERVICES[gigId] ?? null;
      if (!userId) return null;
      return fetchServiceDetail(supabase, gigId, userId);
    },
  });
}

export function useLifecycleAction(gigId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      action: LifecycleAction;
      code?: string;
    }): Promise<LifecycleResult> => {
      if (!supabase) return 'done'; // demo mode: pretend success
      return gigLifecycle(supabase, gigId, input.action, input.code);
    },
    onSuccess: (result) => {
      if (result === 'done') {
        queryClient.invalidateQueries({ queryKey: ['service', gigId] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      }
    },
  });
}
