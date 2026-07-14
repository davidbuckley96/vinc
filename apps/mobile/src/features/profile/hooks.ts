import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyAgenda,
  fetchMyProfile,
  updateMyProfile,
  type AgendaEntry,
  type EditableProfile,
  type UpdateProfileResult,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

/** My open gigs + pending candidacies, to manage from the profile (B-28). */
export function useMyActivity() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['my-activity', userId ?? 'anonymous'],
    queryFn: async (): Promise<{ openGigs: AgendaEntry[]; candidacies: AgendaEntry[] }> => {
      if (!supabase || !userId) return { openGigs: [], candidacies: [] };
      const entries = await fetchMyAgenda(supabase, userId);
      return {
        openGigs: entries.filter(
          (e) => e.role === 'poster' && (e.status === 'open' || e.status === 'pending_payment'),
        ),
        candidacies: entries.filter((e) => e.kind === 'candidacy'),
      };
    },
  });
}

/** The caller's editable profile (D-043). */
export function useMyProfile() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['my-profile', userId ?? 'anonymous'],
    queryFn: async (): Promise<EditableProfile | null> => {
      if (!supabase || !userId) return null;
      return fetchMyProfile(supabase, userId);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async (input: EditableProfile): Promise<UpdateProfileResult> => {
      if (!supabase || !userId) return 'updated'; // demo mode: pretend success
      return updateMyProfile(supabase, userId, input);
    },
    onSuccess: (result) => {
      if (result !== 'updated') return;
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    },
  });
}
