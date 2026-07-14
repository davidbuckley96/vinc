import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { formatHour } from '../dates';
import type { AgendaCommitment } from '../mock';

// Full day (D-053): serviços de madrugada existem, então a agenda mostra 0h–23h.
const FIRST_HOUR = 0;
const LAST_HOUR = 23;
const ROW_HEIGHT = 52;

interface Props {
  commitments: AgendaCommitment[];
  onSearchSlot: (hour: number) => void;
  onPostSlot: (hour: number) => void;
  onOpenCommitment: (commitment: AgendaCommitment) => void;
}

/**
 * Day view: one row per hour. Busy hours show the commitment card; free hours
 * expand on tap into the two core actions (buscar serviço / anunciar vaga).
 */
type DaySegment =
  | { key: string; kind: 'busy'; hour: number; span: number; commitment: AgendaCommitment }
  | { key: string; kind: 'free'; hour: number };

/**
 * Pure: turns commitments into the day's rows. A multi-hour commitment is a
 * SINGLE segment covering its whole span (D-054), instead of a start card
 * plus faded "covered" rows. Kept out of render so the imperative walk
 * doesn't trip the React Compiler's immutability rule.
 */
function buildDaySegments(commitments: AgendaCommitment[]): DaySegment[] {
  const startingAt = (hour: number) => commitments.find((c) => c.startsAt.getHours() === hour);
  const spanHours = (c: AgendaCommitment) =>
    Math.max(1, Math.round((c.endsAt.getTime() - c.startsAt.getTime()) / 3_600_000));

  const segments: DaySegment[] = [];
  let hour = FIRST_HOUR;
  while (hour <= LAST_HOUR) {
    const commitment = startingAt(hour);
    if (commitment) {
      const span = spanHours(commitment);
      segments.push({ key: `c-${hour}`, kind: 'busy', hour, span, commitment });
      hour += span;
    } else {
      segments.push({ key: `h-${hour}`, kind: 'free', hour });
      hour += 1;
    }
  }
  return segments;
}

export function DayTimeline({ commitments, onSearchSlot, onPostSlot, onOpenCommitment }: Props) {
  const theme = useTheme();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const segments = buildDaySegments(commitments);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {segments.map((seg) => {
        if (seg.kind === 'busy') {
          const { commitment, span, hour } = seg;
          const isCandidacy = commitment.kind === 'candidacy';
          return (
            <View key={seg.key} style={styles.row}>
              <Text style={[styles.hour, { color: theme.textSecondary }]}>
                {String(hour).padStart(2, '0')}:00
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenCommitment(commitment)}
                style={[
                  styles.busy,
                  { minHeight: ROW_HEIGHT + (span - 1) * 26 },
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
                  style={[
                    styles.busyTitle,
                    { color: isCandidacy ? theme.textSecondary : theme.primarySoftText },
                  ]}>
                  {commitment.title}
                </Text>
                <Text
                  style={[
                    styles.busyMeta,
                    { color: isCandidacy ? theme.textSecondary : theme.primarySoftMeta },
                  ]}>
                  {formatHour(commitment.startsAt)}–{formatHour(commitment.endsAt)} ·{' '}
                  {formatBRL(commitment.priceCents)}
                  {commitment.counterpartRating
                    ? ` · ★ ${commitment.counterpartRating.toLocaleString('pt-BR')}`
                    : ''}
                  {isCandidacy
                    ? ' · candidatura enviada'
                    : commitment.role === 'poster'
                      ? ' · minha vaga'
                      : ''}
                </Text>
              </Pressable>
            </View>
          );
        }

        const { hour } = seg;
        const selected = selectedHour === hour;
        return (
          <View key={seg.key} style={styles.row}>
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
  busy: {
    flex: 1,
    borderRadius: Radius.medium,
    borderLeftWidth: 3,
    padding: Spacing.two + 3,
    marginBottom: Spacing.two,
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
