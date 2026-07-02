import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { addDays, formatHour, isSameDay, startOfWeek, WEEKDAY_SHORT } from '../dates';
import type { AgendaCommitment } from '../mock';

interface Props {
  selected: Date;
  commitments: AgendaCommitment[];
  onOpenDay: (date: Date) => void;
}

/** Week view: one row per day with its commitments; tapping opens the day. */
export function WeekList({ selected, commitments, onOpenDay }: Props) {
  const theme = useTheme();
  const weekStart = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {days.map((day) => {
        const dayCommitments = commitments.filter((c) => isSameDay(c.startsAt, day));
        const isSelected = isSameDay(day, selected);

        return (
          <Pressable
            key={day.toISOString()}
            accessibilityRole="button"
            onPress={() => onOpenDay(day)}
            style={[
              styles.dayRow,
              { backgroundColor: theme.backgroundElement },
              isSelected && { borderColor: theme.primary, borderWidth: 1.5 },
            ]}>
            <View style={styles.dayLabel}>
              <Text style={[styles.weekday, { color: theme.textSecondary }]}>
                {WEEKDAY_SHORT[day.getDay()]}
              </Text>
              <Text style={[styles.number, { color: theme.text }]}>{day.getDate()}</Text>
            </View>
            <View style={styles.items}>
              {dayCommitments.length === 0 ? (
                <Text style={[styles.freeLabel, { color: theme.textSecondary }]}>
                  Dia livre
                </Text>
              ) : (
                dayCommitments.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.chip, { backgroundColor: theme.primarySoft }]}>
                    <Text
                      numberOfLines={1}
                      style={[styles.chipText, { color: theme.primarySoftText }]}>
                      {formatHour(c.startsAt)}–{formatHour(c.endsAt)} · {c.title}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Pressable>
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
    gap: Spacing.two,
  },
  dayRow: {
    flexDirection: 'row',
    borderRadius: Radius.large,
    padding: Spacing.two + 4,
    gap: Spacing.three,
    alignItems: 'center',
  },
  dayLabel: {
    alignItems: 'center',
    width: 36,
  },
  weekday: {
    fontSize: 11,
  },
  number: {
    fontSize: 17,
    fontWeight: '700',
  },
  items: {
    flex: 1,
    gap: 4,
  },
  freeLabel: {
    fontSize: 12.5,
  },
  chip: {
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
