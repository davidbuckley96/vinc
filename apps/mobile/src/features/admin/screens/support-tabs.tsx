import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import type { ReportItem, TicketItem, UserContext, UserGig } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  useCancelGigOnBehalf,
  useReplyTicket,
  useReports,
  useResolveReport,
  useResolveTicket,
  useSupportTickets,
  useTicketThread,
  useUserContext,
  useUserSearch,
} from '../hooks';

function timeAgo(iso: string): string {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600_000));
  if (hours < 1) return 'agora há pouco';
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.round(hours / 24)}d`;
}

const GIG_STATUS_LABEL: Record<string, string> = {
  open: 'aberta',
  pending_payment: 'aguardando pagamento',
  pending_approval: 'aguardando aprovação',
  accepted: 'aceita',
  in_progress: 'em andamento',
  awaiting_confirmation: 'aguardando confirmação',
  disputed: 'em disputa',
  completed: 'concluída',
  cancelled_by_poster: 'cancelada (anunciante)',
  cancelled_by_worker: 'cancelada (prestador)',
  expired: 'expirada',
};

const LEDGER_LABEL: Record<string, string> = {
  escrow_hold: 'Retenção (escrow)',
  escrow_release: 'Liberação',
  fee: 'Taxa',
  fine: 'Multa',
  refund: 'Reembolso',
  withdrawal: 'Saque',
};

// =========================================================== Denúncias
export function ReportsTab() {
  const theme = useTheme();
  const reports = useReports(true);
  const resolve = useResolveReport();
  const cancelGig = useCancelGigOnBehalf();
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = reports.data ?? [];
  const pending = items.filter((r) => r.status === 'pending');
  const done = items.filter((r) => r.status !== 'pending');

  const act = async (
    report: ReportItem,
    decision: 'actioned' | 'dismissed',
    alsoCancelGig = false,
  ) => {
    setBusyId(report.id);
    if (alsoCancelGig && report.targetType === 'gig') {
      await cancelGig.mutateAsync({ gigId: report.targetId, note: 'denúncia procedente' });
    }
    await resolve.mutateAsync({ reportId: report.id, decision });
    setBusyId(null);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent}>
      {reports.isLoading && <ActivityIndicator color={theme.primary} style={styles.pad} />}
      {reports.isSuccess && items.length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>Nenhuma denúncia. 🎉</Text>
      )}

      {pending.length > 0 && (
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
          PENDENTES ({pending.length})
        </Text>
      )}
      {pending.map((report) => (
        <View key={report.id} style={[styles.card, { borderColor: theme.line }]}>
          <View style={styles.cardTop}>
            <Text style={[styles.pill, { backgroundColor: theme.dangerSoft, color: theme.danger }]}>
              {report.category.toUpperCase()}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {timeAgo(report.createdAt)}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{report.targetLabel}</Text>
          {report.targetDetail && (
            <Text style={[styles.cardBody, { color: theme.textSecondary }]} numberOfLines={4}>
              {report.targetDetail}
            </Text>
          )}
          <Text style={[styles.reason, { color: theme.text }]}>
            “{report.reason}”{' '}
            <Text style={{ color: theme.textSecondary }}>— {report.reporterName}</Text>
          </Text>
          <View style={styles.actionRow}>
            {report.targetType === 'gig' && (
              <Pressable
                accessibilityRole="button"
                disabled={busyId === report.id}
                onPress={() => act(report, 'actioned', true)}
                style={[styles.btn, { backgroundColor: theme.danger }]}>
                <Text style={[styles.btnLabel, { color: theme.onPrimary }]}>Remover a vaga</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busyId === report.id}
              onPress={() => act(report, 'actioned')}
              style={[styles.btn, styles.ghost, { borderColor: theme.danger }]}>
              <Text style={[styles.btnLabel, { color: theme.danger }]}>Confirmar denúncia</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busyId === report.id}
              onPress={() => act(report, 'dismissed')}
              style={[styles.btn, styles.ghost, { borderColor: theme.line }]}>
              <Text style={[styles.btnLabel, { color: theme.textSecondary }]}>Arquivar</Text>
            </Pressable>
            {busyId === report.id && <ActivityIndicator color={theme.primary} />}
          </View>
        </View>
      ))}

      {done.length > 0 && (
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>RESOLVIDAS</Text>
      )}
      {done.map((report) => (
        <View key={report.id} style={[styles.card, { borderColor: theme.line, opacity: 0.7 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{report.targetLabel}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {report.status === 'actioned' ? '✅ Ação tomada' : '🗄️ Arquivada'} ·{' '}
            {report.category}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// =========================================================== Tickets
export function TicketsTab() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const tickets = useSupportTickets(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = tickets.data ?? [];
  const selected =
    items.find((t) => t.id === selectedId) ??
    (wide ? (items.find((t) => t.status === 'waiting_support') ?? items[0] ?? null) : null);

  const list = (
    <ScrollView
      style={[styles.flex, wide && { maxWidth: 320, borderRightWidth: 1, borderRightColor: theme.line }]}>
      {tickets.isLoading && <ActivityIndicator color={theme.primary} style={styles.pad} />}
      {tickets.isSuccess && items.length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>Nenhum ticket. 🎉</Text>
      )}
      {(['waiting_support', 'resolved'] as const).map((section) => {
        const sectionItems = items.filter((t) => t.status === section);
        if (sectionItems.length === 0) return null;
        return (
          <View key={section}>
            <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
              {section === 'waiting_support' ? `NA FILA (${sectionItems.length})` : 'RESOLVIDOS'}
            </Text>
            {sectionItems.map((ticket) => {
              const active = selected?.id === ticket.id;
              return (
                <Pressable
                  key={ticket.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedId(ticket.id)}
                  style={[
                    styles.queueItem,
                    { borderBottomColor: theme.line },
                    active && {
                      backgroundColor: theme.primarySoft,
                      borderLeftWidth: 3,
                      borderLeftColor: theme.primary,
                    },
                  ]}>
                  <Text style={[styles.queueTitle, { color: theme.text }]} numberOfLines={1}>
                    {ticket.userName}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                    {ticket.lastMessage ?? 'sem mensagens'} · {timeAgo(ticket.updatedAt)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.split}>
      {(wide || !selected) && list}
      {selected && <TicketDetail key={selected.id} ticket={selected} onBack={() => setSelectedId(null)} wide={wide} />}
    </View>
  );
}

function TicketDetail({
  ticket,
  onBack,
  wide,
}: {
  ticket: TicketItem;
  onBack: () => void;
  wide: boolean;
}) {
  const theme = useTheme();
  const thread = useTicketThread(ticket.id);
  const context = useUserContext(ticket.userId);
  const reply = useReplyTicket();
  const resolve = useResolveTicket();
  const [draft, setDraft] = useState('');

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    await reply.mutateAsync({ ticketId: ticket.id, replyBody: body });
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent}>
      {!wide && (
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backLink}>
          <Ionicons name="chevron-back" size={16} color={theme.primary} />
          <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>Fila</Text>
        </Pressable>
      )}

      <Text style={[styles.detailTitle, { color: theme.text }]}>{ticket.userName}</Text>
      {ticket.status === 'resolved' && (
        <Text style={[styles.meta, { color: theme.success }]}>✅ Ticket resolvido</Text>
      )}

      {/* Conversa completa (Vi + humano) */}
      <View style={[styles.thread, { borderColor: theme.line }]}>
        {thread.isLoading && <ActivityIndicator color={theme.primary} />}
        {(thread.data ?? []).map((m) => (
          <View
            key={m.id}
            style={[
              styles.msg,
              m.sender === 'user'
                ? { backgroundColor: theme.backgroundElement, alignSelf: 'flex-start' }
                : m.sender === 'agent'
                  ? { backgroundColor: theme.primary, alignSelf: 'flex-end' }
                  : { backgroundColor: theme.primarySoft, alignSelf: 'flex-start' },
            ]}>
            <Text
              style={[
                styles.msgWho,
                { color: m.sender === 'agent' ? theme.onPrimaryMuted : theme.textSecondary },
              ]}>
              {m.sender === 'user' ? 'USUÁRIO' : m.sender === 'agent' ? 'VOCÊ (EQUIPE)' : 'VI'}
            </Text>
            <Text style={{ color: m.sender === 'agent' ? theme.onPrimary : theme.text, fontSize: 13 }}>
              {m.body}
            </Text>
          </View>
        ))}
      </View>

      {ticket.status !== 'resolved' && (
        <>
          <View style={styles.replyRow}>
            <TextInput
              style={[styles.replyInput, { borderColor: theme.line, color: theme.text }]}
              placeholder="Responder ao usuário…"
              placeholderTextColor={theme.textSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              disabled={reply.isPending || !draft.trim()}
              onPress={send}
              style={[styles.send, { backgroundColor: draft.trim() ? theme.primary : theme.backgroundSelected }]}>
              <Ionicons name="send" size={15} color={draft.trim() ? theme.onPrimary : theme.textSecondary} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={resolve.isPending}
            onPress={() => resolve.mutateAsync(ticket.id)}
            style={[styles.btn, styles.ghost, { borderColor: theme.success, alignSelf: 'flex-start' }]}>
            <Text style={[styles.btnLabel, { color: theme.success }]}>Marcar como resolvido</Text>
          </Pressable>
        </>
      )}

      {/* Contexto 360° do usuário */}
      <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>CONTEXTO DO USUÁRIO</Text>
      <UserContext360 userId={ticket.userId} context={context.data ?? null} loading={context.isLoading} />
    </ScrollView>
  );
}

// =========================================================== Usuário 360°
export function UserTab() {
  const theme = useTheme();
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const results = useUserSearch(term);
  const context = useUserContext(selected?.id ?? null);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.tabContent}>
      <TextInput
        style={[styles.search, { borderColor: theme.line, color: theme.text }]}
        placeholder="Buscar usuário pelo nome…"
        placeholderTextColor={theme.textSecondary}
        value={term}
        onChangeText={(t) => {
          setTerm(t);
          setSelected(null);
        }}
        autoCapitalize="words"
      />
      {!selected &&
        (results.data ?? []).map((user) => (
          <Pressable
            key={user.id}
            accessibilityRole="button"
            onPress={() => setSelected(user)}
            style={[styles.resultRow, { borderBottomColor: theme.line }]}>
            <Ionicons name="person-circle-outline" size={20} color={theme.primary} />
            <Text style={{ color: theme.text, fontSize: 14 }}>{user.name}</Text>
          </Pressable>
        ))}
      {!selected && term.trim().length >= 2 && results.isSuccess && (results.data ?? []).length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>Nenhum usuário encontrado.</Text>
      )}

      {selected && (
        <>
          <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.backLink}>
            <Ionicons name="chevron-back" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>Busca</Text>
          </Pressable>
          <Text style={[styles.detailTitle, { color: theme.text }]}>{selected.name}</Text>
          <UserContext360 userId={selected.id} context={context.data ?? null} loading={context.isLoading} />
        </>
      )}
    </ScrollView>
  );
}

/** Shared 360° card: profile summary, gigs (both roles) with unblock, ledger. */
function UserContext360({
  userId,
  context,
  loading,
}: {
  userId: string;
  context: UserContext | null;
  loading: boolean;
}) {
  const theme = useTheme();
  const cancelGig = useCancelGigOnBehalf();
  const [feedback, setFeedback] = useState<string | null>(null);

  if (loading) return <ActivityIndicator color={theme.primary} style={styles.pad} />;
  if (!context) return null;

  const canUnblock = (status: string) => status === 'open' || status === 'pending_approval';

  const unblock = async (gig: UserGig) => {
    setFeedback(null);
    const result = await cancelGig.mutateAsync({ gigId: gig.id, note: 'desbloqueio pelo suporte' });
    setFeedback(
      result === 'ok'
        ? `Vaga "${gig.title}" cancelada.`
        : result === 'needs_dispute'
          ? 'Essa vaga já tem pagamento/serviço em andamento — resolva pela aba Disputas.'
          : 'Não foi possível cancelar agora.',
    );
  };

  const gigBlock = (label: string, gigs: UserGig[]) =>
    gigs.length > 0 && (
      <View style={styles.ctxBlock}>
        <Text style={[styles.ctxLabel, { color: theme.textSecondary }]}>{label}</Text>
        {gigs.map((gig) => (
          <View key={gig.id} style={[styles.gigRow, { borderColor: theme.line }]}>
            <View style={styles.flex}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {gig.title}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11.5 }}>
                {GIG_STATUS_LABEL[gig.status] ?? gig.status} · {formatBRL(gig.priceCents)}
              </Text>
            </View>
            {canUnblock(gig.status) && (
              <Pressable
                accessibilityRole="button"
                disabled={cancelGig.isPending}
                onPress={() => unblock(gig)}
                style={[styles.smallBtn, { borderColor: theme.danger }]}>
                <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    );

  return (
    <View style={styles.ctx}>
      {context.createdAt && (
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          Na plataforma desde {new Date(context.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      )}
      {context.bio && <Text style={{ color: theme.text, fontSize: 13 }}>{context.bio}</Text>}

      {feedback && <Text style={[styles.feedback, { color: theme.primary }]}>{feedback}</Text>}

      {gigBlock('COMO ANUNCIANTE', context.asPoster)}
      {gigBlock('COMO PRESTADOR', context.asWorker)}

      {context.ledger.length > 0 && (
        <View style={styles.ctxBlock}>
          <Text style={[styles.ctxLabel, { color: theme.textSecondary }]}>
            HISTÓRICO DE PAGAMENTOS
          </Text>
          {context.ledger.slice(0, 12).map((line, index) => (
            <View key={`${line.createdAt}-${index}`} style={styles.ledgerRow}>
              <Text style={{ color: theme.text, fontSize: 12.5 }}>
                {LEDGER_LABEL[line.type] ?? line.type}
              </Text>
              <Text
                style={{
                  color: line.amountCents < 0 ? theme.danger : theme.success,
                  fontSize: 12.5,
                  fontWeight: '700',
                }}>
                {line.amountCents < 0 ? '−' : '+'}
                {formatBRL(Math.abs(line.amountCents))}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  split: { flex: 1, flexDirection: 'row' },
  pad: { margin: 20 },
  tabContent: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  empty: { fontSize: 13.5, textAlign: 'center', padding: Spacing.four },
  sectionHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  card: { borderWidth: 1.5, borderRadius: Radius.medium, padding: Spacing.two + 4, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    alignSelf: 'flex-start',
    fontSize: 9.5,
    fontWeight: '800',
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardBody: { fontSize: 12.5, lineHeight: 18 },
  reason: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  meta: { fontSize: 11.5 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center', marginTop: 4 },
  btn: { borderRadius: Radius.medium - 2, paddingVertical: 9, paddingHorizontal: 13 },
  ghost: { borderWidth: 1.5 },
  btnLabel: { fontSize: 12, fontWeight: '800' },
  queueItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1, gap: 3 },
  queueTitle: { fontSize: 13.5, fontWeight: '700' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  detailTitle: { fontSize: 17, fontWeight: '800' },
  thread: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two,
    gap: Spacing.one + 2,
  },
  msg: {
    maxWidth: '88%',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 3,
  },
  msgWho: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, marginBottom: 2 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  replyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 9,
    fontSize: 13,
    maxHeight: 90,
  },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  search: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  ctx: { gap: Spacing.two },
  ctxBlock: { gap: 5, marginTop: Spacing.one },
  ctxLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  gigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.small,
    padding: Spacing.two,
  },
  smallBtn: { borderWidth: 1.5, borderRadius: Radius.small, paddingHorizontal: 10, paddingVertical: 5 },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  feedback: { fontSize: 12.5, fontWeight: '700' },
});
