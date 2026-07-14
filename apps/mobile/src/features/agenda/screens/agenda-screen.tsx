import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useUnreadNotifications } from '@/features/notifications/hooks';
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
  const unread = useUnreadNotifications();
  const commitments = agenda.data ?? [];
  const dayCommitments = commitments.filter((c) => isSameDay(c.startsAt, selectedDate));
  // Past day (B-27): só visualização — não dá para buscar/anunciar no passado.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isPastDay = selectedDate < startOfToday && !isSameDay(selectedDate, startOfToday);

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
              <View style={styles.headerActions}>
                {/* Notification bell (round 12, option A — block 2.6). */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir notificações"
                  onPress={() => router.push('/notifications')}
                  style={styles.bell}>
                  <Ionicons name="notifications-outline" size={19} color={theme.onPrimary} />
                  {(unread.data ?? 0) > 0 && (
                    <View style={[styles.bellBadge, { backgroundColor: theme.danger }]}>
                      <Text style={[styles.bellBadgeLabel, { color: theme.onPrimary }]}>
                        {unread.data! > 9 ? '9+' : unread.data}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <View style={[styles.avatar, { backgroundColor: theme.background }]}>
                  <Text style={[styles.avatarLabel, { color: theme.primary }]}>
                    {(userName ?? 'V').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <ViewSwitcher value={view} onChange={setView} />
          </SafeAreaView>
        </View>

        {view === 'day' && <DateStrip selected={selectedDate} onSelect={setSelectedDate} />}

        {view === 'day' && (
          <DayTimeline
            commitments={dayCommitments}
            readOnly={isPastDay}
            onSearchSlot={(hour) => {
              const day = new Date(selectedDate);
              const pad = (n: number) => String(n).padStart(2, '0');
              router.push(
                `/search?day=${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}&hour=${hour}`,
              );
            }}
            onPostSlot={() => router.push('/post')}
            onOpenCommitment={(commitment) =>
              router.push(
                commitment.kind === 'candidacy'
                  ? `/gig/${commitment.id}`
                  : `/service/${commitment.id}`,
              )
            }
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  bell: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
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
