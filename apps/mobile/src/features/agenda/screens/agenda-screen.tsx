import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useUnreadNotifications } from '@/features/notifications/hooks';
import { useMyProfile } from '@/features/profile/hooks';
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
  // G-06/G-14 (docs/16): nome e foto vêm SEMPRE de profiles.name/avatar_url
  // (fonte única), não do user_metadata do login — assim a saudação e o avatar
  // refletem edições na hora. `userName` fica só como placeholder até carregar.
  const profile = useMyProfile();
  const displayName = profile.data?.name ?? userName ?? null;
  const avatarUrl = profile.data?.avatarUrl ?? null;
  const [view, setView] = useState<AgendaView>('day');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [scrollToHour, setScrollToHour] = useState<number | null>(null);

  // Deep-link "ver na minha agenda" (docs/17): abre no dia certo e rola até a
  // hora do serviço. `router.replace('/?day=YYYY-MM-DD&hour=HH')`.
  const params = useLocalSearchParams<{ day?: string; hour?: string }>();
  useEffect(() => {
    if (!params.day) return;
    const [y, m, d] = params.day.split('-').map(Number);
    if (!y || !m || !d) return;
    setSelectedDate(new Date(y, m - 1, d));
    setView('day');
    setScrollToHour(params.hour != null ? Number(params.hour) : null);
  }, [params.day, params.hour]);

  const agenda = useMyAgenda();
  const unread = useUnreadNotifications();
  const commitments = agenda.data ?? [];
  const dayCommitments = commitments.filter((c) => isSameDay(c.startsAt, selectedDate));
  // Past day (B-27): só visualização — não dá para buscar/anunciar no passado.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isPastDay = selectedDate < startOfToday && !isSameDay(selectedDate, startOfToday);

  // Trocar de dia manualmente cancela o scroll do deep-link (senão ele voltaria
  // a rolar para a hora antiga ao mudar de dia).
  const pickDate = (date: Date) => {
    setSelectedDate(date);
    setScrollToHour(null);
  };
  const openDay = (date: Date) => {
    pickDate(date);
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
                  {displayName ? `Olá, ${displayName.split(' ')[0]}! 👋` : 'Olá! 👋'}
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
                {/* G-07: abre o perfil · G-14: mostra a foto quando existir. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir meu perfil"
                  onPress={() => router.push('/profile')}
                  style={[styles.avatar, { backgroundColor: theme.background }]}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={[styles.avatarLabel, { color: theme.primary }]}>
                      {(displayName ?? 'V').trim().charAt(0).toUpperCase()}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
            <ViewSwitcher value={view} onChange={setView} />
          </SafeAreaView>
        </View>

        {view === 'day' && <DateStrip selected={selectedDate} onSelect={pickDate} />}

        {view === 'day' && (
          <DayTimeline
            commitments={dayCommitments}
            readOnly={isPastDay}
            scrollToHour={scrollToHour}
            onSearchSlot={(hour) => {
              const day = new Date(selectedDate);
              const pad = (n: number) => String(n).padStart(2, '0');
              router.push(
                `/search?day=${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}&hour=${hour}`,
              );
            }}
            // Criar vaga a partir de um horário (docs/17): leva o dia+hora
            // marcados para o formulário já pré-preenchido.
            onPostSlot={(hour) => {
              const day = new Date(selectedDate);
              const pad = (n: number) => String(n).padStart(2, '0');
              router.push(
                `/post?day=${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}&hour=${hour}`,
              );
            }}
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
    overflow: 'hidden',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
