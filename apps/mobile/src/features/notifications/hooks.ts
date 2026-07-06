import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markNotificationsRead,
  type AppNotification,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_NOTIFICATIONS } from './demo';

export function useNotifications() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['notifications', 'list', userId ?? 'anonymous'],
    queryFn: async (): Promise<AppNotification[]> => {
      if (!supabase) return DEMO_NOTIFICATIONS;
      if (!userId) return [];
      return fetchNotifications(supabase, userId);
    },
  });
}

/** Badge on the agenda bell; refreshes on focus + every 30s. */
export function useUnreadNotifications() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['notifications', 'unread', userId ?? 'anonymous'],
    queryFn: async (): Promise<number> => {
      if (!supabase) return DEMO_NOTIFICATIONS.filter((item) => !item.readAt).length;
      if (!userId) return 0;
      return fetchUnreadNotificationsCount(supabase, userId);
    },
    refetchInterval: 30_000,
  });
}

/**
 * Opening the center clears the badge. Only the COUNT is invalidated —
 * the open list keeps showing which items were new this visit.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !userId) return;
      await markNotificationsRead(supabase, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });
}
