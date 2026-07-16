import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  fetchFaq,
  fetchLatestTicket,
  fetchTicketMessages,
  closeMyTicket,
  sendToVi,
  type FaqArticle,
  type SupportMessage,
  type TicketStatus,
} from '@vinc/api';

import { useSession } from '@/features/auth/session-context';
import { supabase } from '@/lib/supabase';

/** FAQ knowledge base — the same rows that also feed the Vi (single source). */
export function useFaq() {
  return useQuery({
    queryKey: ['faq'],
    queryFn: (): Promise<FaqArticle[]> => {
      if (!supabase) return Promise.resolve([]);
      return fetchFaq(supabase);
    },
    staleTime: 5 * 60_000,
  });
}

export interface ViTurn {
  id: string;
  sender: 'user' | 'ai' | 'agent';
  body: string;
  pending?: boolean;
}

/**
 * The conversation with the Vi. Resumes the user's latest open ticket, or
 * starts fresh (no ticket until the first message). Realtime pushes agent
 * replies while the ticket is waiting for a human; a slow poll covers
 * silent socket drops.
 */
export function useVi() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [status, setStatus] = useState<TicketStatus>('ai');
  const [optimistic, setOptimistic] = useState<ViTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Resume the latest non-resolved ticket once the session is known.
  const latest = useQuery({
    queryKey: ['support-latest', userId],
    queryFn: () => {
      if (!supabase || !userId) return Promise.resolve(null);
      return fetchLatestTicket(supabase, userId);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (latest.data && latest.data.status !== 'resolved') {
      setTicketId(latest.data.id);
      setStatus(latest.data.status);
    }
  }, [latest.data]);

  const messages = useQuery({
    queryKey: ['support-messages', ticketId],
    queryFn: (): Promise<SupportMessage[]> => {
      if (!supabase || !ticketId) return Promise.resolve([]);
      return fetchTicketMessages(supabase, ticketId);
    },
    enabled: !!ticketId,
    refetchInterval: status === 'waiting_support' ? 12_000 : 30_000,
  });

  // Realtime: new agent/ai rows appear without a refetch.
  useEffect(() => {
    if (!supabase || !ticketId) return undefined;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-messages', ticketId] });
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  const send = useMutation({
    mutationFn: async (message: string) => {
      if (!supabase) return null;
      return sendToVi(supabase, { ticketId: ticketId ?? undefined, message });
    },
    onMutate: (message: string) => {
      setSendError(null);
      setThinking(true);
      setOptimistic((cur) => [
        ...cur,
        { id: `local-${Date.now()}`, sender: 'user', body: message, pending: true },
      ]);
    },
    onSuccess: (res) => {
      if (!res || !res.ok) {
        setSendError('Não foi possível enviar agora. Verifique sua conexão.');
        return;
      }
      setTicketId(res.data.ticketId);
      setStatus(res.data.status);
      queryClient.invalidateQueries({ queryKey: ['support-messages', res.data.ticketId] });
    },
    onError: () => {
      setSendError('Não foi possível enviar agora. Verifique sua conexão.');
    },
    onSettled: () => {
      setThinking(false);
    },
  });

  // G-12: sair da fila / marcar resolvido — fecha o ticket e volta a Vi a um
  // estado limpo (próxima mensagem abre um ticket novo).
  const resolve = useMutation({
    mutationFn: async () => {
      if (!supabase || !ticketId) return null;
      return closeMyTicket(supabase, ticketId);
    },
    onSuccess: (res) => {
      if (!res || !res.ok) {
        setSendError('Não foi possível encerrar agora. Verifique sua conexão.');
        return;
      }
      setTicketId(null);
      setStatus('ai');
      setOptimistic([]);
      setSendError(null);
      queryClient.invalidateQueries({ queryKey: ['support-latest', userId] });
    },
    onError: () => {
      setSendError('Não foi possível encerrar agora. Verifique sua conexão.');
    },
  });

  // Server rows are the source of truth; drop optimistic once a matching
  // user row has landed.
  const server = messages.data ?? [];
  const serverUserBodies = new Set(
    server.filter((m) => m.sender === 'user').map((m) => m.body),
  );
  const stillPending = optimistic.filter((o) => !serverUserBodies.has(o.body));

  useEffect(() => {
    if (stillPending.length !== optimistic.length) {
      setOptimistic(stillPending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.length]);

  const thread: ViTurn[] = [
    ...server.map((m) => ({ id: m.id, sender: m.sender, body: m.body })),
    ...stillPending,
  ];

  return {
    thread,
    status,
    thinking: thinking && !send.isError,
    sendError,
    isSending: send.isPending,
    isLoadingHistory: !!ticketId && messages.isLoading,
    hasTicket: !!ticketId,
    send: (message: string) => send.mutate(message),
    // G-12: só faz sentido "sair da fila" quando há ticket na fila do humano.
    canLeaveQueue: !!ticketId && status === 'waiting_support',
    isLeavingQueue: resolve.isPending,
    leaveQueue: () => resolve.mutate(),
  };
}
