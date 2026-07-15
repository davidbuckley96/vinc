import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  fetchConversations,
  fetchMessages,
  fetchUnreadCount,
  markMessagesRead,
  sendMessage,
  type Conversation,
  type GigMessage,
  type SendMessageResult,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

import { DEMO_MESSAGES } from './demo';

/** In demo mode "I" am this id (matches DEMO_SERVICES counterparts). */
export const DEMO_SELF_ID = 'demo-user';

/**
 * Live conversation of a gig: Realtime pushes new rows in; a slow poll
 * covers reconnects and platforms where the socket drops silently.
 */
export function useMessages(gigId: string, enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', gigId],
    queryFn: (): Promise<GigMessage[]> => {
      if (!supabase) return Promise.resolve(DEMO_MESSAGES.filter((m) => m.gigId === gigId));
      return fetchMessages(supabase, gigId);
    },
    enabled,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!supabase || !enabled) return undefined;
    const channel = supabase
      .channel(`gig-messages-${gigId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gig_messages', filter: `gig_id=eq.${gigId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            gig_id: string;
            sender_id: string;
            body: string;
            created_at: string;
          };
          queryClient.setQueryData<GigMessage[]>(['messages', gigId], (current = []) =>
            current.some((message) => message.id === row.id)
              ? current
              : [
                  ...current,
                  {
                    id: row.id,
                    gigId: row.gig_id,
                    senderId: row.sender_id,
                    body: row.body,
                    createdAt: row.created_at,
                  },
                ],
          );
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [gigId, enabled, queryClient]);

  return query;
}

/** Inbox: all my conversations (D-070), newest activity first. */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: (): Promise<Conversation[]> => {
      if (!supabase) return Promise.resolve([]); // demo: no live conversations
      return fetchConversations(supabase);
    },
    refetchInterval: 20_000,
  });
}

/** Total unread across conversations — the badge on the Messages tab. */
export function useTotalUnreadMessages(): number {
  const { data } = useConversations();
  return (data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
}

export function useSendMessage(gigId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const senderId = session?.user.id ?? DEMO_SELF_ID;

  return useMutation({
    mutationFn: async (body: string): Promise<SendMessageResult> => {
      if (!supabase) return 'sent'; // demo mode: optimistic append below
      return sendMessage(supabase, gigId, senderId, body);
    },
    onMutate: async (body: string) => {
      // Optimistic append; Realtime/refetch reconciles by real id.
      const optimistic: GigMessage = {
        id: `local-${Date.now()}`,
        gigId,
        senderId,
        body,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<GigMessage[]>(['messages', gigId], (current = []) => [
        ...current,
        optimistic,
      ]);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (result, _body, context) => {
      if (result !== 'sent' && context) {
        queryClient.setQueryData<GigMessage[]>(['messages', gigId], (current = []) =>
          current.filter((message) => message.id !== context.optimisticId),
        );
      }
      if (supabase) {
        queryClient.invalidateQueries({ queryKey: ['messages', gigId] });
        // Bump the inbox's last-message preview (D-070).
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    },
  });
}

/** Unread badge for the service screen ("N novas"). */
export function useUnreadCount(gigId: string, enabled: boolean) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useQuery({
    queryKey: ['unread', gigId, userId ?? 'anonymous'],
    queryFn: (): Promise<number> => {
      if (!supabase || !userId) return Promise.resolve(0);
      return fetchUnreadCount(supabase, gigId, userId);
    },
    enabled,
    refetchInterval: 20_000,
  });
}

export function useMarkRead(gigId: string) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  return useMutation({
    mutationFn: async () => {
      if (!supabase || !userId) return;
      await markMessagesRead(supabase, gigId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread', gigId] });
      // Clears the unread badge on the Messages tab / inbox row (D-070).
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
