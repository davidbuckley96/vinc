import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Buffer } from 'buffer';

import {
  fetchMyAgenda,
  fetchMyProfile,
  updateMyProfile,
  uploadAvatar,
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
    mutationFn: async (
      input: Pick<EditableProfile, 'name' | 'bio' | 'city'>,
    ): Promise<UpdateProfileResult> => {
      if (!supabase || !userId) return 'updated'; // demo mode: pretend success
      return updateMyProfile(supabase, userId, input);
    },
    onSuccess: (result) => {
      if (result !== 'updated') return;
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // A1 (docs/13): a query de stats é ['profile','stats',userId] — invalidar
      // ['profile-stats'] (uma string só) NÃO casava, então nome/cidade/foto
      // ficavam velhos até reabrir o app. O prefixo ['profile','stats'] casa.
      queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });
    },
  });
}

/**
 * Uploads a new profile photo (B-30/D-064): reads the picked image and pushes
 * it to the public `avatars` bucket, saving the URL on the profile. Returns
 * the new URL or null on failure.
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async (input: { base64: string; mime: string }): Promise<string | null> => {
      if (!supabase || !userId) return null;
      // Decoded base64 bytes — fetch(uri).blob() is broken in RN and uploaded
      // nothing, so the avatar silently "didn't change" (F-07 sibling, docs/14).
      const bytes = Buffer.from(input.base64, 'base64');
      return uploadAvatar(supabase, userId, bytes, input.mime);
    },
    onSuccess: (url) => {
      if (!url) return;
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // A1 (docs/13): a query de stats é ['profile','stats',userId] — invalidar
      // ['profile-stats'] (uma string só) NÃO casava, então nome/cidade/foto
      // ficavam velhos até reabrir o app. O prefixo ['profile','stats'] casa.
      queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });
    },
  });
}
