import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { formatMonthTitle, isSameDay, monthMatrix } from '../dates';
import type { AgendaCommitment } from '../mock';

const WEEK_HEADER = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

interface Props {
  selected: Date;
  commitments: AgendaCommitment[];
  onOpenDay: (date: Date) => void;
}

/**
 * Month view: calendar grid with commitment dots; tapping a day opens it.
 * Navega meses para frente (planejar com antecedência) e para trás — meses
 * passados servem só para ver os dias em que houve serviço (B-27). O botão de
 * mês fica no topo, então a altura variável do mês não o move.
 */
export function MonthGrid({ selected, commitments, onOpenDay }: Props) {
  const theme = useTheme();
  const [viewDate, setViewDate] = useState(() => new Date(selected));
  const weeks = monthMatrix(viewDate);
  const shiftMonth = (delta: number) =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.navRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => shiftMonth(-1)}
          hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{formatMonthTitle(viewDate)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => shiftMonth(1)}
          hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.headerRow}>
        {WEEK_HEADER.map((label) => (
          <Text key={label} style={[styles.headerCell, { color: theme.textSecondary }]}>
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={styles.weekRow}>
          {week.map((day) => {
            const inMonth = day.getMonth() === viewDate.getMonth();
            const isSelected = isSameDay(day, selected);
            const hasCommitment = commitments.some((c) => isSameDay(c.startsAt, day));

            return (
              <Pressable
                key={day.toISOString()}
                accessibilityRole="button"
                onPress={() => onOpenDay(day)}
                style={[styles.dayCell, isSelected && { backgroundColor: theme.primary }]}>
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isSelected
                        ? theme.onPrimary
                        : inMonth
                          ? theme.text
                          : theme.textSecondary,
                      opacity: inMonth ? 1 : 0.4,
                    },
                  ]}>
                  {day.getDate()}
                </Text>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: hasCommitment
                        ? isSelected
                          ? theme.onPrimary
                          : theme.primary
                        : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    margin: 1,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: Radius.pill,
    marginTop: 2,
  },
});
