import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Props {
  visible: boolean;
  selected: Date;
  /** Days before this are disabled (defaults to today). */
  minDate?: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

/**
 * Pure-JS month calendar (no native deps) for picking a gig's day when it
 * isn't today/tomorrow (D-053). Past days are disabled; recomputes "today"
 * on every open, so it's safe across midnight.
 */
export function MonthCalendar({ visible, selected, minDate, onSelect, onClose }: Props) {
  const theme = useTheme();
  const today = startOfDay(new Date());
  const floor = minDate ? startOfDay(minDate) : today;
  const [view, setView] = useState({ year: selected.getFullYear(), month: selected.getMonth() });

  const firstOfMonth = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.year, view.month, d));
  // Always fill to 6 weeks (42 cells) so the grid height is constant — a month
  // needing 6 rows (e.g. jan/2027) must not shove the nav buttons around and
  // cause mis-taps or an accidental close (B-20).
  while (cells.length < 42) cells.push(null);

  // Don't let the user page back before the floor month.
  const canGoPrev =
    view.year > floor.getFullYear() ||
    (view.year === floor.getFullYear() && view.month > floor.getMonth());

  const shift = (delta: number) => {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle}>
              <View style={[styles.grabber, { backgroundColor: theme.line }]} />
            </View>

            <View style={styles.navRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                disabled={!canGoPrev}
                onPress={() => shift(-1)}
                hitSlop={10}
                style={{ opacity: canGoPrev ? 1 : 0.3 }}>
                <Ionicons name="chevron-back" size={22} color={theme.text} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: theme.text }]}>
                {MONTHS[view.month]} de {view.year}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                onPress={() => shift(1)}
                hitSlop={10}>
                <Ionicons name="chevron-forward" size={22} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={[styles.weekday, { color: theme.textSecondary }]}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((date, i) => {
                if (!date) return <View key={i} style={styles.cell} />;
                const disabled = date < floor;
                const isSelected = sameDay(date, selected);
                return (
                  <View key={i} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() => {
                        onSelect(startOfDay(date));
                        onClose();
                      }}
                      style={[
                        styles.day,
                        isSelected && { backgroundColor: theme.primary },
                      ]}>
                      <Text
                        style={[
                          styles.dayLabel,
                          { color: isSelected ? theme.onPrimary : theme.text },
                          disabled && { color: theme.textSecondary, opacity: 0.35 },
                        ]}>
                        {date.getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  handle: { alignItems: 'center', paddingVertical: Spacing.two },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  monthLabel: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  day: {
    flex: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 14.5, fontWeight: '600' },
});
