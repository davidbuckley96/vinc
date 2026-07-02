import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { addDays, isSameDay, startOfWeek, WEEKDAY_SHORT } from '../dates';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
}

/** Week strip (Monday–Sunday) with the selected day highlighted. */
export function DateStrip({ selected, onSelect }: Props) {
  const theme = useTheme();
  const weekStart = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const isSelected = isSameDay(day, selected);
        return (
          <Pressable
            key={day.toISOString()}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(day)}
            style={[styles.day, isSelected && { backgroundColor: theme.primary }]}>
            <Text
              style={[
                styles.weekday,
                { color: isSelected ? theme.onPrimary : theme.textSecondary },
              ]}>
              {WEEKDAY_SHORT[day.getDay()]}
            </Text>
            <Text
              style={[styles.number, { color: isSelected ? theme.onPrimary : theme.text }]}>
              {day.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.medium,
    paddingVertical: 7,
  },
  weekday: {
    fontSize: 11,
  },
  number: {
    fontSize: 15,
    fontWeight: '700',
  },
});
