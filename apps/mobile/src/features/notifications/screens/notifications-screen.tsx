import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppNotification } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useMarkNotificationsRead, useNotifications } from '../hooks';
import { dayGroupLabel, NOTIFICATION_PRESENTATIONS, timeLabel } from '../labels';

/**
 * Notification center — round 12, option A: one plain list grouped by
 * day, unread in lilac; tapping opens the service, where the action
 * happens. Opening the center clears the bell badge.
 */
export function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    markRead.mutate();
    // Once, when the center opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const now = new Date();
    const result: Array<{ label: string; items: AppNotification[] }> = [];
    for (const item of notifications.data ?? []) {
      const label = dayGroupLabel(item.createdAt, now);
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(item);
      else result.push({ label, items: [item] });
    }
    return result;
  }, [notifications.data]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Notificações</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {notifications.isLoading && <ActivityIndicator color={theme.primary} />}
          {notifications.isSuccess && groups.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={30} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Nada por aqui ainda. Os avisos dos seus serviços aparecem nesta tela.
              </Text>
            </View>
          )}

          {groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
                {group.label}
              </Text>
              {group.items.map((item) => {
                const presentation = NOTIFICATION_PRESENTATIONS[item.type];
                const unread = !item.readAt;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    disabled={!item.gigId}
                    onPress={() => item.gigId && router.push(`/service/${item.gigId}`)}
                    style={[
                      styles.item,
                      { borderColor: theme.line },
                      unread && {
                        backgroundColor: theme.primarySoft,
                        borderColor: theme.dashedBorder,
                      },
                    ]}>
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: unread ? theme.background : theme.primarySoft },
                      ]}>
                      <Ionicons
                        name={presentation.icon}
                        size={15}
                        color={theme.primarySoftText}
                      />
                    </View>
                    <View style={styles.itemBody}>
                      <Text
                        style={[
                          styles.itemText,
                          { color: unread ? theme.primarySoftText : theme.text },
                        ]}>
                        {presentation.text(item.gigTitle ?? 'Serviço')}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                        {timeLabel(item.createdAt, new Date())}
                      </Text>
                    </View>
                    {unread && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
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
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  group: {
    gap: Spacing.one + 2,
  },
  groupLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium + 1,
    padding: Spacing.two + 2,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 1,
  },
  itemText: {
    fontSize: 13,
    lineHeight: 18.5,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 11,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
});
