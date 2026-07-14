import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAlert,
  deleteAlert,
  fetchMyAlerts,
  setAlertActive,
  type JobAlert,
  type JobAlertInput,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

/** The caller's saved job alerts (B-30 fatia 3, D-064). */
export function useMyAlerts() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['job-alerts', userId ?? 'anonymous'],
    queryFn: async (): Promise<JobAlert[]> => {
      if (!supabase || !userId) return [];
      return fetchMyAlerts(supabase, userId);
    },
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async (input: JobAlertInput): Promise<JobAlert | null> => {
      if (!supabase || !userId) return null;
      return createAlert(supabase, userId, input);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts'] }),
  });
}

export function useSetAlertActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { alertId: string; active: boolean }): Promise<boolean> => {
      if (!supabase) return true;
      return setAlertActive(supabase, input.alertId, input.active);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts'] }),
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string): Promise<boolean> => {
      if (!supabase) return true;
      return deleteAlert(supabase, alertId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-alerts'] }),
  });
}
