import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDispute,
  openDispute,
  uploadDisputePhoto,
  type Dispute,
  type OpenDisputeResult,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

/** The gig's dispute, if any (RLS: participants and admins — D-031). */
export function useDispute(gigId: string) {
  return useQuery({
    queryKey: ['dispute', gigId],
    queryFn: async (): Promise<Dispute | null> => {
      if (!supabase) return null; // demo mode: no dispute
      return fetchDispute(supabase, gigId);
    },
  });
}

/** A photo picked for the report (expo-image-picker asset subset). */
export interface DisputePhoto {
  uri: string;
}

/**
 * Uploads the photos to the private bucket, then opens the dispute
 * (docs/02 §6 — D-028/D-031).
 */
export function useOpenDispute(gigId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async (input: {
      reason: string;
      photos: DisputePhoto[];
    }): Promise<OpenDisputeResult> => {
      if (!supabase) return 'opened'; // demo mode: pretend success
      if (!userId) return 'unauthorized';
      const paths: string[] = [];
      for (const [index, photo] of input.photos.entries()) {
        const blob = await (await fetch(photo.uri)).blob();
        paths.push(await uploadDisputePhoto(supabase, userId, gigId, index, blob));
      }
      return openDispute(supabase, gigId, input.reason, paths);
    },
    onSuccess: (result) => {
      if (result === 'opened') {
        queryClient.invalidateQueries({ queryKey: ['dispute', gigId] });
        queryClient.invalidateQueries({ queryKey: ['service', gigId] });
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      }
    },
  });
}
