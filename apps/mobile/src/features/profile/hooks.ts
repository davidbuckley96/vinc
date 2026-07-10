import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyProfile,
  fetchPublicGender,
  updateMyProfile,
  type EditableProfile,
} from '@vinc/api';
import type { Gender } from '@vinc/core';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

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
    mutationFn: async (input: EditableProfile): Promise<void> => {
      if (!supabase || !userId) return; // demo mode: pretend success
      await updateMyProfile(supabase, userId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    },
  });
}

/** A worker's gender for their PUBLIC profile — null unless opted in (D-043). */
export function usePublicGender(userId: string | null) {
  return useQuery({
    queryKey: ['public-gender', userId ?? 'anonymous'],
    queryFn: async (): Promise<Gender | null> => {
      if (!supabase || !userId) return null;
      return fetchPublicGender(supabase, userId);
    },
  });
}
