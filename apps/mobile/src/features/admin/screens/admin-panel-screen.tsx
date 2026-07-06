import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DisputeQueueItem } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  useDisputeCase,
  useDisputeQueue,
  useIsAdmin,
  usePartyStats,
  useResolveDispute,
} from '../hooks';

const KIND_LABELS = {
  pre_release: 'PRÉ-LIBERAÇÃO',
  post_release: 'REEMBOLSO',
} as const;

function timeAgo(iso: string): string {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600_000));
  if (hours < 1) return 'agora há pouco';
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.round(hours / 24)}d`;
}

function clock(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

/** "40" | "40,50" (reais) → cents; null when unparseable. */
function parseReais(text: string): number | null {
  const cleaned = text.replace(/[R$\s.]/g, '').replace(',', '.');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

type Decision = { refundCents: number; label: string };

/**
 * Dispute panel — round 11, option A (docs/02 §6 — D-028): queue on the
 * left, the selected case on the right with accusation × defense side by
 * side (upload times tell who registered what, when), decision pinned at
 * the bottom. Access: profiles.is_admin only (RLS backs it — a non-admin
 * would see empty data even if they reached the route).
 */
export function AdminPanelScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const isAdmin = useIsAdmin();
  const queue = useDisputeQueue(isAdmin.data === true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = queue.data ?? [];
  const selected =
    items.find((item) => item.id === selectedId) ??
    (wide ? (items.find((item) => item.status === 'open') ?? items[0] ?? null) : null);

  if (isAdmin.isSuccess && !isAdmin.data) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <SafeAreaView edges={['top']} style={styles.restricted}>
          <Ionicons name="lock-closed" size={34} color={theme.textSecondary} />
          <Text style={[styles.restrictedText, { color: theme.textSecondary }]}>
            Área restrita da plataforma.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')}>
            <Text style={[styles.restrictedLink, { color: theme.primary }]}>Voltar ao app</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const queueList = (
    <ScrollView
      style={[
        styles.queue,
        wide && { width: 300, borderRightWidth: 1, borderRightColor: theme.line },
      ]}>
      {queue.isLoading && <ActivityIndicator color={theme.primary} style={{ margin: 20 }} />}
      {queue.isSuccess && items.length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          Nenhuma disputa. 🎉
        </Text>
      )}
      {(['open', 'resolved'] as const).map((section) => {
        const sectionItems = items.filter((item) => item.status === section);
        if (sectionItems.length === 0) return null;
        return (
          <View key={section}>
            <Text style={[styles.queueHeader, { color: theme.textSecondary }]}>
              {section === 'open' ? `ABERTAS (${sectionItems.length})` : 'RESOLVIDAS'}
            </Text>
            {sectionItems.map((item) => {
              const active = selected?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedId(item.id)}
                  style={[
                    styles.queueItem,
                    { borderBottomColor: theme.line },
                    active && {
                      backgroundColor: theme.primarySoft,
                      borderLeftWidth: 3,
                      borderLeftColor: theme.primary,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.pill,
                      item.status === 'resolved'
                        ? { backgroundColor: theme.backgroundElement, color: theme.success }
                        : item.kind === 'pre_release'
                          ? { backgroundColor: theme.dangerSoft, color: theme.danger }
                          : { backgroundColor: theme.backgroundElement, color: theme.warning },
                    ]}>
                    {item.status === 'resolved'
                      ? item.refundCents
                        ? `REEMBOLSO ${formatBRL(item.refundCents)}`
                        : 'IMPROCEDENTE'
                      : KIND_LABELS[item.kind]}
                  </Text>
                  <Text style={[styles.queueTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.gigTitle}
                  </Text>
                  <Text style={[styles.queueMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.posterName.split(' ')[0]} × {item.workerName.split(' ')[0]} ·{' '}
                    {formatBRL(item.priceCents)} · {timeAgo(item.createdAt)}
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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { backgroundColor: theme.primary }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBarRow}>
            {!wide && selected ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar à fila"
                onPress={() => setSelectedId(null)}
                hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar ao app"
                onPress={() => router.replace('/')}
                hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.onPrimary} />
              </Pressable>
            )}
            <Text style={[styles.topBarTitle, { color: theme.onPrimary }]}>
              Vinc · Painel de disputas
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.split}>
        {(wide || !selected) && queueList}
        {selected && (
          <CaseFile key={selected.id} item={selected} wide={wide} />
        )}
        {wide && !selected && queue.isSuccess && items.length > 0 && (
          <View style={styles.casePlaceholder}>
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
              Escolha um caso na fila.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function CaseFile({ item, wide }: { item: DisputeQueueItem; wide: boolean }) {
  const theme = useTheme();
  const caseFile = useDisputeCase(item);
  const poster = usePartyStats(item.posterId || null);
  const worker = usePartyStats(item.workerId || null);
  const resolve = useResolveDispute();

  const [chatOpen, setChatOpen] = useState(false);
  const [partial, setPartial] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = new Date(item.startsAt);
  const data = caseFile.data;

  const arm = (refundCents: number | null, label: string) => {
    setError(null);
    if (refundCents === null) {
      setError('Digite o valor do reembolso parcial (ex.: 40 ou 40,50).');
      return;
    }
    if (refundCents > item.priceCents) {
      setError(`O reembolso não pode passar de ${formatBRL(item.priceCents)} — a taxa nunca é reembolsada.`);
      return;
    }
    setDecision({ refundCents, label });
  };

  const confirm = async () => {
    if (!decision) return;
    setError(null);
    const result = await resolve.mutateAsync({
      disputeId: item.id,
      refundCents: decision.refundCents,
    });
    if (result !== 'resolved') {
      setError(
        result === 'state_changed'
          ? 'Este caso acabou de ser resolvido em outra janela.'
          : 'Não foi possível resolver agora. Tente de novo.',
      );
    }
    setDecision(null);
  };

  const photoRow = (urls: string[]) =>
    urls.length > 0 && (
      <View style={styles.photoRow}>
        {urls.map((url, index) => (
          <Pressable
            key={`${index}-${url.slice(-24)}`}
            accessibilityRole="button"
            accessibilityLabel={`Abrir foto ${index + 1}`}
            onPress={() => Linking.openURL(url)}>
            <Image source={{ uri: url }} style={[styles.photo, { backgroundColor: theme.primarySoft }]} />
          </Pressable>
        ))}
      </View>
    );

  const partyLine = (
    name: string,
    stats: ReturnType<typeof usePartyStats>['data'],
    side: 'poster' | 'worker',
  ) => {
    const rating = side === 'poster' ? stats?.posterAvgRating : stats?.workerAvgRating;
    const count = side === 'poster' ? stats?.completedAsPoster : stats?.completedAsWorker;
    const bits = [name.split(' ')[0]];
    if (rating != null) bits.push(`⭐ ${rating.toFixed(1).replace('.', ',')}`);
    if (count != null) bits.push(`${count} serviços`);
    return bits.join(' · ');
  };

  return (
    <ScrollView style={styles.case} contentContainerStyle={styles.caseContent}>
      <View style={styles.caseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.caseTitle, { color: theme.text }]}>{item.gigTitle}</Text>
          <Text style={[styles.caseMeta, { color: theme.textSecondary }]}>
            {start.getDate()}/{start.getMonth() + 1} ·{' '}
            {item.kind === 'pre_release'
              ? 'contestada em vez de confirmar (pagamento congelado)'
              : 'pedido de reembolso após a liberação (valor congelado na carteira)'}
          </Text>
        </View>
        <Text style={[styles.caseMoney, { color: theme.primary }]}>
          {formatBRL(item.priceCents)}
        </Text>
      </View>

      <Text style={[styles.contextLine, { color: theme.textSecondary }]}>
        {data?.checkinDone ? '✅ Check-in feito (código digitado)' : '⚠️ Sem registro de check-in'}
        {'   '}
        {partyLine(item.posterName, poster.data, 'poster')}
        {'   ×   '}
        {partyLine(item.workerName, worker.data, 'worker')}
      </Text>

      {caseFile.isLoading && <ActivityIndicator color={theme.primary} style={{ margin: 16 }} />}

      {data && (
        <>
          <View style={[styles.cols, !wide && { flexDirection: 'column' }]}>
            <View style={[styles.box, { borderColor: '#F3D0D0', backgroundColor: theme.dangerSoft }]}>
              <Text style={[styles.boxHeader, { color: theme.danger }]}>
                RELATO DE {item.posterName.split(' ')[0]?.toUpperCase()} (ANUNCIANTE) ·{' '}
                {clock(item.createdAt)}
              </Text>
              <Text style={[styles.boxText, { color: theme.text }]}>“{item.reason}”</Text>
              {photoRow(data.disputePhotoUrls)}
              {data.disputePhotoUrls.length > 0 && (
                <Text style={[styles.boxHint, { color: theme.textSecondary }]}>
                  fotos enviadas na abertura da contestação
                </Text>
              )}
            </View>
            <View style={[styles.box, { borderColor: '#CFE8DD', backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.boxHeader, { color: theme.success }]}>
                PROVA DE {item.workerName.split(' ')[0]?.toUpperCase()} (PRESTADOR)
                {data.completionReportedAt ? ` · ${clock(data.completionReportedAt)}, na conclusão` : ''}
              </Text>
              {data.completionReport || data.completionPhotoUrls.length > 0 ? (
                <>
                  {data.completionReport && (
                    <Text style={[styles.boxText, { color: theme.text }]}>
                      “{data.completionReport}”
                    </Text>
                  )}
                  {photoRow(data.completionPhotoUrls)}
                  {data.completionPhotoUrls.length > 0 && (
                    <Text style={[styles.boxHint, { color: theme.textSecondary }]}>
                      fotos enviadas AO CONCLUIR — compare os horários
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.boxText, { color: theme.textSecondary }]}>
                  O prestador não anexou provas de conclusão.
                </Text>
              )}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setChatOpen((open) => !open)}
            style={[styles.chatBox, { borderColor: theme.line }]}>
            <Text style={[styles.chatSummary, { color: theme.textSecondary }]}>
              💬 Conversa ({data.messages.length}{' '}
              {data.messages.length === 1 ? 'mensagem' : 'mensagens'}) —{' '}
              {chatOpen ? 'fechar ▲' : 'abrir ▼'}
            </Text>
            {chatOpen &&
              data.messages.map((message, index) => (
                <Text
                  key={`${message.createdAt}-${index}`}
                  style={[styles.chatLine, { color: theme.text }]}>
                  <Text style={{ fontWeight: '800' }}>
                    {message.senderId === item.posterId
                      ? item.posterName.split(' ')[0]
                      : item.workerName.split(' ')[0]}
                  </Text>
                  <Text style={{ color: theme.textSecondary }}> {clock(message.createdAt)}</Text>
                  {'  '}
                  {message.body}
                </Text>
              ))}
            {chatOpen && data.messages.length === 0 && (
              <Text style={[styles.chatLine, { color: theme.textSecondary }]}>
                Sem mensagens neste serviço.
              </Text>
            )}
          </Pressable>
        </>
      )}

      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

      {item.status === 'resolved' ? (
        <View style={[styles.resolved, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.resolvedText, { color: theme.success }]}>
            Resolvida {item.resolvedAt ? timeAgo(item.resolvedAt) : ''}:{' '}
            {item.refundCents
              ? `reembolso de ${formatBRL(item.refundCents)} ao anunciante; o restante foi do prestador.`
              : 'improcedente — pagamento liberado integralmente ao prestador.'}
          </Text>
          {item.resolutionNote && (
            <Text style={[styles.resolvedNote, { color: theme.textSecondary }]}>
              “{item.resolutionNote}”
            </Text>
          )}
        </View>
      ) : decision ? (
        <View style={[styles.decide, { borderTopColor: theme.line }]}>
          <Text style={[styles.confirmText, { color: theme.text }]}>
            {decision.label} — confirmar?
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={resolve.isPending}
            onPress={confirm}
            style={[styles.btn, { backgroundColor: theme.danger }]}>
            {resolve.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.btnLabel, { color: theme.onPrimary }]}>Confirmar decisão</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDecision(null)}
            style={[styles.btn, styles.btnGhost, { borderColor: theme.line }]}>
            <Text style={[styles.btnLabel, { color: theme.textSecondary }]}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.decide, { borderTopColor: theme.line }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              arm(item.priceCents, `Reembolso TOTAL de ${formatBRL(item.priceCents)} ao anunciante`)
            }
            style={[styles.btn, { backgroundColor: theme.danger }]}>
            <Text style={[styles.btnLabel, { color: theme.onPrimary }]}>Reembolso total</Text>
          </Pressable>
          <TextInput
            style={[styles.amount, { borderColor: theme.line, color: theme.text }]}
            placeholder="R$ 0,00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={partial}
            onChangeText={setPartial}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const cents = parseReais(partial);
              arm(cents, cents === null ? '' : `Reembolso PARCIAL de ${formatBRL(cents)} ao anunciante`);
            }}
            style={[styles.btn, styles.btnGhost, { borderColor: theme.danger }]}>
            <Text style={[styles.btnLabel, { color: theme.danger }]}>Reembolso parcial</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => arm(0, 'Improcedente — liberar o pagamento integral ao prestador')}
            style={[styles.btn, styles.btnGhost, { borderColor: theme.success }]}>
            <Text style={[styles.btnLabel, { color: theme.success }]}>Improcedente — liberar</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  restricted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  restrictedText: {
    fontSize: 14.5,
  },
  restrictedLink: {
    fontSize: 14,
    fontWeight: '800',
  },
  topBar: {},
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two + 2,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  queue: {
    flex: 1,
  },
  queueHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  queueItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: 3,
  },
  pill: {
    alignSelf: 'flex-start',
    fontSize: 9.5,
    fontWeight: '800',
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  queueTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  queueMeta: {
    fontSize: 11.5,
  },
  empty: {
    fontSize: 13.5,
    textAlign: 'center',
    padding: Spacing.four,
  },
  case: {
    flex: 2,
  },
  caseContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  casePlaceholder: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  caseTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  caseMeta: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  caseMoney: {
    fontSize: 17,
    fontWeight: '800',
  },
  contextLine: {
    fontSize: 12,
    lineHeight: 18,
  },
  cols: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  box: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    gap: 6,
  },
  boxHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  boxText: {
    fontSize: 13,
    lineHeight: 19,
  },
  boxHint: {
    fontSize: 10.5,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: Radius.small,
  },
  chatBox: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    gap: 6,
  },
  chatSummary: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  chatLine: {
    fontSize: 12.5,
    lineHeight: 19,
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  decide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.two + 2,
    marginTop: Spacing.one,
  },
  btn: {
    borderRadius: Radius.medium - 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  btnGhost: {
    borderWidth: 1.5,
  },
  btnLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  amount: {
    borderWidth: 1.5,
    borderRadius: Radius.medium - 2,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 13,
    width: 110,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '700',
    flexBasis: '100%',
  },
  resolved: {
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    gap: 4,
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  resolvedNote: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
