import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { formatHour } from '../dates';
import type { AgendaCommitment } from '../mock';

// Full day (D-053): serviços de madrugada existem, então a agenda mostra 0h–23h.
const FIRST_HOUR = 0;
const LAST_HOUR = 23;
// Pixels per hour inside a cluster block — the column heights encode each
// commitment's duration (Option C, B-26).
const HOUR_PX = 48;

interface Props {
  commitments: AgendaCommitment[];
  onSearchSlot: (hour: number) => void;
  onPostSlot: (hour: number) => void;
  onOpenCommitment: (commitment: AgendaCommitment) => void;
  /** Past day (B-27): só visualização — não dá para buscar/anunciar no passado. */
  readOnly?: boolean;
  /** Scroll the timeline so this hour is visible (deep-link from a service). */
  scrollToHour?: number | null;
}

/** A commitment placed on the hour grid (start inclusive, end exclusive). */
interface Placed {
  commitment: AgendaCommitment;
  startHour: number;
  endHour: number;
}

/**
 * A group of commitments that overlap in time (B-26), laid out as side-by-side
 * columns (Google-Agenda style, David's choice — rodada 20 opção C). A single
 * non-overlapping commitment is just a one-column cluster.
 */
interface Cluster {
  startHour: number;
  endHour: number;
  columns: Placed[][];
}

type DaySegment =
  | { key: string; kind: 'cluster'; hour: number; span: number; cluster: Cluster }
  | { key: string; kind: 'free'; hour: number };

/**
 * Pure: turns commitments into the day's rows. Overlapping commitments are
 * grouped into a cluster and split into columns so ALL of them show (B-26),
 * instead of only the first one. Kept out of render so the imperative walk
 * doesn't trip the React Compiler's immutability rule.
 */
function buildDaySegments(commitments: AgendaCommitment[]): DaySegment[] {
  const placed: Placed[] = commitments
    .map((commitment) => {
      const startHour = commitment.startsAt.getHours();
      const span = Math.max(
        1,
        Math.round((commitment.endsAt.getTime() - commitment.startsAt.getTime()) / 3_600_000),
      );
      // Clamp to the day so a cross-midnight gig just runs to 24h in this view.
      return { commitment, startHour, endHour: Math.min(LAST_HOUR + 1, startHour + span) };
    })
    .sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);

  // Group into clusters of transitively-overlapping commitments.
  const clusters: Cluster[] = [];
  for (const item of placed) {
    const current = clusters[clusters.length - 1];
    if (current && item.startHour < current.endHour) {
      current.endHour = Math.max(current.endHour, item.endHour);
      // First column whose last commitment ends by this one's start; else a new one.
      const column = current.columns.find(
        (col) => col[col.length - 1]!.endHour <= item.startHour,
      );
      if (column) column.push(item);
      else current.columns.push([item]);
    } else {
      clusters.push({ startHour: item.startHour, endHour: item.endHour, columns: [[item]] });
    }
  }

  // Walk the day, emitting free hours and cluster blocks in order.
  const segments: DaySegment[] = [];
  let hour = FIRST_HOUR;
  let next = 0;
  while (hour <= LAST_HOUR) {
    const cluster = clusters[next];
    if (cluster && cluster.startHour === hour) {
      segments.push({
        key: `cl-${hour}`,
        kind: 'cluster',
        hour,
        span: cluster.endHour - cluster.startHour,
        cluster,
      });
      hour = cluster.endHour;
      next += 1;
    } else {
      segments.push({ key: `h-${hour}`, kind: 'free', hour });
      hour += 1;
    }
  }
  return segments;
}

export function DayTimeline({
  commitments,
  onSearchSlot,
  onPostSlot,
  onOpenCommitment,
  readOnly = false,
  scrollToHour = null,
}: Props) {
  const theme = useTheme();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const segments = buildDaySegments(commitments);

  // Deep-link scroll (H-01, docs/17): rows are ~52px (free) vs span×48px (cluster),
  // so we capture each hour's real y via onLayout instead of estimating.
  const scrollRef = useRef<ScrollView>(null);
  const hourY = useRef<Record<number, number>>({});
  const registerRow = (startHour: number, span: number) => (e: LayoutChangeEvent) => {
    const { y } = e.nativeEvent.layout;
    for (let h = startHour; h < startHour + span; h += 1) hourY.current[h] = y;
  };
  // O scroll é só um POSICIONAMENTO INICIAL (David): rola uma vez para a hora do
  // deep-link e não prende o usuário ali. Sem isto, cada refetch da agenda (o
  // react-query devolve um novo array `commitments`) redispararia o efeito e
  // puxaria a tela de volta mesmo depois de a pessoa ter rolado para outra hora.
  const scrolledFor = useRef<number | null>(null);
  useEffect(() => {
    if (scrollToHour == null) {
      scrolledFor.current = null; // reset para um próximo deep-link
      return;
    }
    if (scrolledFor.current === scrollToHour) return; // já posicionou nesta hora
    // Let the rows lay out first, then scroll a touch above the target hour.
    const timer = setTimeout(() => {
      const y = hourY.current[scrollToHour];
      if (y != null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
        scrolledFor.current = scrollToHour; // marca como feito só ao rolar de fato
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [scrollToHour, commitments]);

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
      {segments.map((seg) => {
        if (seg.kind === 'cluster') {
          const { cluster, span, hour } = seg;
          const blockHeight = span * HOUR_PX;
          // Single column keeps the roomy full-width look; multiple columns
          // (overlapping candidacies) share the width side by side (B-26).
          const single = cluster.columns.length === 1;
          return (
            <View key={seg.key} style={styles.row} onLayout={registerRow(hour, span)}>
              <Text style={[styles.hour, { color: theme.textSecondary }]}>
                {String(hour).padStart(2, '0')}:00
              </Text>
              <View style={[styles.clusterLane, { height: blockHeight }]}>
                {cluster.columns.map((column, colIndex) => (
                  <View key={colIndex} style={styles.clusterColumn}>
                    {column.map((placed) => {
                      const { commitment } = placed;
                      const isCandidacy = commitment.kind === 'candidacy';
                      const top = (placed.startHour - cluster.startHour) * HOUR_PX;
                      const height = (placed.endHour - placed.startHour) * HOUR_PX - 6;
                      return (
                        <Pressable
                          key={commitment.id}
                          accessibilityRole="button"
                          onPress={() => onOpenCommitment(commitment)}
                          style={[
                            styles.busy,
                            { position: 'absolute', top, height, left: 0, right: 0 },
                            isCandidacy
                              ? {
                                  backgroundColor: theme.background,
                                  borderLeftColor: theme.dashedBorder,
                                  borderWidth: 1.5,
                                  borderColor: theme.dashedBorder,
                                  borderStyle: 'dashed',
                                }
                              : { backgroundColor: theme.primarySoft, borderLeftColor: theme.primary },
                          ]}>
                          <Text
                            numberOfLines={single ? 1 : 2}
                            style={[
                              styles.busyTitle,
                              { color: isCandidacy ? theme.textSecondary : theme.primarySoftText },
                            ]}>
                            {commitment.title}
                          </Text>
                          <Text
                            numberOfLines={single ? 1 : 2}
                            style={[
                              styles.busyMeta,
                              { color: isCandidacy ? theme.textSecondary : theme.primarySoftMeta },
                            ]}>
                            {formatHour(commitment.startsAt)}–{formatHour(commitment.endsAt)}
                            {single
                              ? ` · ${formatBRL(commitment.priceCents)}${
                                  commitment.counterpartRating
                                    ? ` · ★ ${commitment.counterpartRating.toLocaleString('pt-BR')}`
                                    : ''
                                }${
                                  isCandidacy
                                    ? ' · candidatura enviada'
                                    : commitment.role === 'poster'
                                      ? ' · minha vaga'
                                      : ''
                                }`
                              : ` · ${formatBRL(commitment.priceCents)}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          );
        }

        const { hour } = seg;
        const selected = selectedHour === hour;
        // Past day (B-27): free hours are just shown, not actionable.
        if (readOnly) {
          return (
            <View key={seg.key} style={styles.row} onLayout={registerRow(hour, 1)}>
              <Text style={[styles.hour, { color: theme.textSecondary }]}>
                {String(hour).padStart(2, '0')}:00
              </Text>
              <View style={[styles.free, { borderColor: theme.line, opacity: 0.5 }]}>
                <Text style={[styles.freeLabel, { color: theme.textSecondary }]}>livre</Text>
              </View>
            </View>
          );
        }
        return (
          <View key={seg.key} style={styles.row} onLayout={registerRow(hour, 1)}>
            <Text style={[styles.hour, { color: theme.textSecondary }]}>
              {String(hour).padStart(2, '0')}:00
            </Text>
            {selected ? (
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSearchSlot(hour)}
                  style={[styles.action, { backgroundColor: theme.primary }]}>
                  <Ionicons name="search" size={16} color={theme.onPrimary} />
                  <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                    Buscar serviços
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onPostSlot(hour)}
                  style={[
                    styles.action,
                    styles.actionOutline,
                    { borderColor: theme.primary, backgroundColor: theme.background },
                  ]}>
                  <Ionicons name="megaphone-outline" size={16} color={theme.primary} />
                  <Text style={[styles.actionLabel, { color: theme.primary }]}>Anunciar vaga</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Horário livre às ${hour} horas`}
                onPress={() => setSelectedHour(hour)}
                style={[styles.free, { borderColor: theme.dashedBorder }]}>
                <Text style={[styles.freeLabel, { color: theme.textSecondary }]}>
                  Horário livre
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    minHeight: 52,
  },
  hour: {
    width: 44,
    fontSize: 11,
    textAlign: 'right',
    paddingTop: 4,
  },
  clusterLane: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one + 1,
    marginBottom: Spacing.two,
  },
  clusterColumn: {
    flex: 1,
    position: 'relative',
  },
  busy: {
    borderRadius: Radius.medium,
    borderLeftWidth: 3,
    padding: Spacing.two + 3,
    overflow: 'hidden',
  },
  busyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  busyMeta: {
    fontSize: 11.5,
    marginTop: 1,
  },
  free: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  freeLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  action: {
    flex: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
  },
  actionOutline: {
    borderWidth: 1.5,
  },
  actionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
