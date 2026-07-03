import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { DateStrip } from '../components/date-strip';
import { DayTimeline } from '../components/day-timeline';
import { MonthGrid } from '../components/month-grid';
import { ViewSwitcher, type AgendaView } from '../components/view-switcher';
import { WeekList } from '../components/week-list';
import { formatLongDate, isSameDay } from '../dates';
import { useMyAgenda } from '../hooks';

/**
 * Home screen — the product's core loop (docs/02 §8): a calendar where any
 * free slot can be filled with a gig (worker) or announced as one (poster).
 * Layout follows the approved design direction C (docs/06 D-005).
 */
export function AgendaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { userName } = useSession();
  const [view, setView] = useState<AgendaView>('day');
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const agenda = useMyAgenda();
  const commitments = agenda.data ?? [];
  const dayCommitments = commitments.filter((c) => isSameDay(c.startsAt, selectedDate));

  const openDay = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.hello, { color: theme.onPrimary }]}>
                  {userName ? `Olá, ${userName.split(' ')[0]}! 👋` : 'Olá! 👋'}
                </Text>
                <Text style={[styles.date, { color: theme.onPrimaryMuted }]}>
                  {formatLongDate(selectedDate)}
                </Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: theme.background }]}>
                <Text style={[styles.avatarLabel, { color: theme.primary }]}>
                  {(userName ?? 'V').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <ViewSwitcher value={view} onChange={setView} />
          </SafeAreaView>
        </View>

        {view === 'day' && <DateStrip selected={selectedDate} onSelect={setSelectedDate} />}

        {view === 'day' && (
          <DayTimeline
            commitments={dayCommitments}
            onSearchSlot={() => router.push('/search')}
            onPostSlot={() => router.push('/post')}
            onOpenCommitment={(commitment) => router.push(`/service/${commitment.id}`)}
          />
        )}
        {view === 'week' && (
          <WeekList selected={selectedDate} commitments={commitments} onOpenDay={openDay} />
        )}
        {view === 'month' && (
          <MonthGrid selected={selectedDate} commitments={commitments} onOpenDay={openDay} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    borderBottomLeftRadius: Radius.xlarge,
    borderBottomRightRadius: Radius.xlarge,
    paddingBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two + 4,
  },
  hello: {
    fontSize: 19,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    marginTop: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
