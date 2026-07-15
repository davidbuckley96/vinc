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

export interface DateRange {
  start: Date;
  end: Date;
}

interface Props {
  visible: boolean;
  /** Pre-selected range to show highlighted; null starts fresh. */
  range: DateRange | null;
  onConfirm: (range: DateRange) => void;
  onClose: () => void;
}

/**
 * Range calendar for the search filter (B-05): tap the start day, then the end
 * day; tapping the same day twice keeps it a single day. Pure JS (no native
 * deps), past days disabled, "today" recomputed on open (midnight-safe).
 */
export function DateRangeCalendar({ visible, range, onConfirm, onClose }: Props) {
  const theme = useTheme();
  const today = startOfDay(new Date());
  // Draft selection while the sheet is open. `end === null` means the user has
  // tapped the start and is waiting to pick the end.
  const [draftStart, setDraftStart] = useState<Date | null>(range?.start ?? null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(range?.end ?? null);
  const [view, setView] = useState({
    year: (range?.start ?? today).getFullYear(),
    month: (range?.start ?? today).getMonth(),
  });

  // A4 (docs/13): the modal stays mounted (only `visible` toggles), so the
  // `useState` initializers run once and never reflect a `range` set later via
  // the "Hoje/Amanhã" chips. Re-seed the draft + month view on the open edge,
  // using React's "adjust state while rendering" pattern (no effect, no
  // cascading-render warning). Edits made while open are never clobbered.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraftStart(range?.start ?? null);
      setDraftEnd(range?.end ?? null);
      const anchor = range?.start ?? today;
      setView({ year: anchor.getFullYear(), month: anchor.getMonth() });
    }
  }

  const tapDay = (date: Date) => {
    // Starting fresh, or a completed range exists → begin a new range.
    if (!draftStart || draftEnd) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }
    // Second tap: below the start restarts; otherwise closes the range.
    if (date < draftStart) {
      setDraftStart(date);
      setDraftEnd(null);
    } else {
      setDraftEnd(date);
    }
  };

  const confirm = () => {
    if (!draftStart) return;
    onConfirm({ start: draftStart, end: draftEnd ?? draftStart });
    onClose();
  };

  const firstOfMonth = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.year, view.month, d));
  // Fixed 6-week height so paging months never shifts the nav buttons (B-20).
  while (cells.length < 42) cells.push(null);

  const canGoPrev =
    view.year > today.getFullYear() ||
    (view.year === today.getFullYear() && view.month > today.getMonth());

  const shift = (delta: number) => {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const inRange = (date: Date): boolean => {
    if (!draftStart || !draftEnd) return false;
    return date > draftStart && date < draftEnd;
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

            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {draftStart && !draftEnd
                ? 'Agora toque no último dia (ou no mesmo, para um só dia).'
                : 'Toque no primeiro dia da faixa.'}
            </Text>

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
                const disabled = date < today;
                const isStart = draftStart ? sameDay(date, draftStart) : false;
                const isEnd = draftEnd ? sameDay(date, draftEnd) : false;
                const isEdge = isStart || isEnd;
                const isMiddle = inRange(date);
                return (
                  <View key={i} style={styles.cell}>
                    <View
                      style={[
                        styles.cellFill,
                        (isMiddle || (isEdge && draftEnd && !sameDay(draftStart!, draftEnd))) && {
                          backgroundColor: theme.primarySoft,
                        },
                        // Round the band's outer corners on the two edges.
                        isStart && draftEnd && !sameDay(draftStart!, draftEnd) && styles.bandStart,
                        isEnd && draftEnd && !sameDay(draftStart!, draftEnd) && styles.bandEnd,
                      ]}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={disabled}
                        onPress={() => tapDay(startOfDay(date))}
                        style={[styles.day, isEdge && { backgroundColor: theme.primary }]}>
                        <Text
                          style={[
                            styles.dayLabel,
                            { color: isEdge ? theme.onPrimary : theme.text },
                            isMiddle && { color: theme.primarySoftText, fontWeight: '800' },
                            disabled && { color: theme.textSecondary, opacity: 0.35 },
                          ]}>
                          {date.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!draftStart}
              onPress={confirm}
              style={[
                styles.confirm,
                { backgroundColor: theme.primary, opacity: draftStart ? 1 : 0.4 },
              ]}>
              <Text style={[styles.confirmLabel, { color: theme.onPrimary }]}>
                {draftStart && draftEnd && !sameDay(draftStart, draftEnd)
                  ? 'Aplicar faixa'
                  : 'Aplicar dia'}
              </Text>
            </Pressable>
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
  hint: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
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
  cellFill: {
    flex: 1,
    borderRadius: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  bandStart: {
    borderTopLeftRadius: Radius.medium,
    borderBottomLeftRadius: Radius.medium,
  },
  bandEnd: {
    borderTopRightRadius: Radius.medium,
    borderBottomRightRadius: Radius.medium,
  },
  day: {
    flex: 1,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 14.5, fontWeight: '600' },
  confirm: {
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmLabel: { fontSize: 14.5, fontWeight: '800' },
});
