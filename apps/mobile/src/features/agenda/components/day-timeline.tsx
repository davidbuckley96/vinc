import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { formatHour } from '../dates';
import type { AgendaCommitment } from '../mock';

const FIRST_HOUR = 6;
const LAST_HOUR = 23;

interface Props {
  commitments: AgendaCommitment[];
  onSearchSlot: (hour: number) => void;
  onPostSlot: (hour: number) => void;
}

/**
 * Day view: one row per hour. Busy hours show the commitment card; free hours
 * expand on tap into the two core actions (buscar serviço / anunciar vaga).
 */
export function DayTimeline({ commitments, onSearchSlot, onPostSlot }: Props) {
  const theme = useTheme();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
  const startingAt = (hour: number) =>
    commitments.find((c) => c.startsAt.getHours() === hour);
  const coveredBy = (hour: number) =>
    commitments.find((c) => hour > c.startsAt.getHours() && hour < c.endsAt.getHours());

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {hours.map((hour) => {
        const commitment = startingAt(hour);
        const covering = coveredBy(hour);
        const selected = selectedHour === hour;

        return (
          <View key={hour} style={styles.row}>
            <Text style={[styles.hour, { color: theme.textSecondary }]}>
              {String(hour).padStart(2, '0')}:00
            </Text>

            {commitment ? (
              <View
                style={[
                  styles.busy,
                  { backgroundColor: theme.primarySoft, borderLeftColor: theme.primary },
                ]}>
                <Text style={[styles.busyTitle, { color: theme.primarySoftText }]}>
                  {commitment.title}
                </Text>
                <Text style={[styles.busyMeta, { color: theme.primarySoftMeta }]}>
                  {formatHour(commitment.startsAt)}–{formatHour(commitment.endsAt)} ·{' '}
                  {formatBRL(commitment.priceCents)}
                  {commitment.counterpartRating
                    ? ` · ★ ${commitment.counterpartRating.toLocaleString('pt-BR')}`
                    : ''}
                  {commitment.role === 'poster' ? ' · minha vaga' : ''}
                </Text>
              </View>
            ) : covering ? (
              <View style={[styles.covered, { backgroundColor: theme.primarySoft }]} />
            ) : selected ? (
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
                  <Text style={[styles.actionLabel, { color: theme.primary }]}>
                    Anunciar vaga
                  </Text>
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
  covered: {
    flex: 1,
    borderRadius: Radius.small,
    opacity: 0.45,
    marginBottom: Spacing.two,
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
