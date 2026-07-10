import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchServiceDetail,
  gigLifecycle,
  uploadCompletionPhoto,
  type LifecycleAction,
  type LifecycleResult,
  type ServiceDetail,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_SERVICES } from './demo';

export function useServiceDetail(gigId: string) {
  const { status, session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    // userId in the key + the loading gate: a deep link boots the app
    // BEFORE the session hydrates — without these the query caches null
    // under the session-less key and the screen shows an error forever.
    queryKey: ['service', gigId, userId ?? 'anonymous'],
    queryFn: async (): Promise<ServiceDetail | null> => {
      if (!supabase) return DEMO_SERVICES[gigId] ?? null;
      if (!userId) return null;
      return fetchServiceDetail(supabase, gigId, userId);
    },
    enabled: status !== 'loading',
  });
}

/**
 * Worker finishes the service with optional evidence (D-032): photos go
 * to the private bucket first, then complete is called. A late complete
 * (the 12h job already moved the gig) only attaches the evidence.
 */
export function useCompleteService(gigId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async (input: {
      report: string;
      photos: { uri: string }[];
    }): Promise<LifecycleResult> => {
      if (!supabase) return 'done'; // demo mode: pretend success
      if (!userId) return 'unauthorized';
      const photoPaths: string[] = [];
      for (const [index, photo] of input.photos.entries()) {
        const blob = await (await fetch(photo.uri)).blob();
        photoPaths.push(await uploadCompletionPhoto(supabase, userId, gigId, index, blob));
      }
      return gigLifecycle(supabase, gigId, 'complete', undefined, {
        report: input.report.trim() || undefined,
        photoPaths,
      });
    },
    onSuccess: (result) => {
      if (result === 'done') {
        queryClient.invalidateQueries({ queryKey: ['service', gigId] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
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
