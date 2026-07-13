import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyProfile,
  updateMyProfile,
  type EditableProfile,
  type UpdateProfileResult,
} from '@vinc/api';

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
