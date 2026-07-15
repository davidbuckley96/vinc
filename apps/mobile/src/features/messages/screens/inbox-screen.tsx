import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Conversation } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useConversations } from '../hooks';

/** Status → chip label + tone. Only the states the inbox shows (D-070). */
function statusChip(status: string): { label: string; tone: 'active' | 'wait' | 'dispute' | 'done' } {
  switch (status) {
    case 'in_progress':
      return { label: 'em andamento', tone: 'active' };
    case 'accepted':
      return { label: 'a combinar', tone: 'active' };
    case 'awaiting_confirmation':
      return { label: 'aguardando confirmação', tone: 'wait' };
    case 'disputed':
      return { label: 'em disputa', tone: 'dispute' };
    case 'completed':
      return { label: 'concluído', tone: 'done' };
    default:
      return { label: status, tone: 'done' };
  }
}

/** "14:32" today, "ontem", "seg", "12/07". */
function whenLabel(iso: string | null, now: Date): string {
  if (!iso) return '';
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (days === 1) return 'ontem';
  if (days < 7) return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()]!;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Messages inbox (F-02, D-070 · rodada 22 opção B): every conversation with its
 * gig context + status, last message and unread badge. Tapping opens the chat.
 */
export function InboxScreen() {
  const theme = useTheme();
  const router = useRouter();
  const conversations = useConversations();
  const now = new Date();

  const toneColor = (tone: ReturnType<typeof statusChip>['tone']) =>
    tone === 'active'
      ? theme.success
      : tone === 'wait'
        ? theme.warning
        : tone === 'dispute'
          ? theme.danger
          : theme.textSecondary;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Mensagens</Text>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {conversations.isLoading && <ActivityIndicator color={theme.primary} />}
          {conversations.isSuccess && (conversations.data?.length ?? 0) === 0 && (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={30} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Suas conversas aparecem aqui quando você é escolhido para um serviço ou escolhe um
                prestador.
              </Text>
            </View>
          )}

          {(conversations.data ?? []).map((c: Conversation) => {
            const chip = statusChip(c.status);
            const unread = c.unreadCount > 0;
            const initial = (c.counterpartName ?? '?').trim().charAt(0).toUpperCase();
            const preview =
              c.lastMessage ??
              (c.status === 'accepted'
                ? 'Combine os detalhes do serviço.'
                : 'Nenhuma mensagem ainda.');
            return (
              <Pressable
                key={c.gigId}
                accessibilityRole="button"
                accessibilityLabel={`Conversa com ${c.counterpartName} sobre ${c.title}`}
                onPress={() => router.push(`/chat/${c.gigId}`)}
                style={[styles.conv, { borderBottomColor: theme.line }]}>
                {c.counterpartAvatar ? (
                  <Image source={{ uri: c.counterpartAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primarySoft }]}>
                    <Text style={[styles.avatarInitial, { color: theme.primarySoftText }]}>{initial}</Text>
                  </View>
                )}
                <View style={styles.mid}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {c.counterpartName}
                  </Text>
                  <Text
                    style={[styles.preview, { color: unread ? theme.text : theme.textSecondary }, unread && styles.previewUnread]}
                    numberOfLines={1}>
                    {preview}
                  </Text>
                  <View style={styles.chipRow}>
                    <Text style={[styles.chip, { color: toneColor(chip.tone) }]} numberOfLines={1}>
                      ● {c.title} · {chip.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.time, { color: unread ? theme.primary : theme.textSecondary }]}>
                    {whenLabel(c.lastMessageAt, now)}
                  </Text>
                  {unread && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.badgeText}>{c.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: {
    borderBottomLeftRadius: Radius.xlarge,
    borderBottomRightRadius: Radius.xlarge,
  },
  headerRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.five },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyText: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  conv: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, flexShrink: 0 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 17, fontWeight: '800' },
  mid: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 14.5, fontWeight: '800' },
  preview: { fontSize: 12.5 },
  previewUnread: { fontWeight: '600' },
  chipRow: { marginTop: 2 },
  chip: { fontSize: 10.5, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  time: { fontSize: 10.5, fontWeight: '700' },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
});
