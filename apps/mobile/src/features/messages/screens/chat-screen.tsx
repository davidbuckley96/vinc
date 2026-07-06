import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GigMessage } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useServiceDetail } from '@/features/services/hooks';
import { useTheme } from '@/hooks/use-theme';

import { DEMO_SELF_ID, useMarkRead, useMessages, useSendMessage } from '../hooks';

/**
 * One-tap phrases for the service day (round 9, option B — D-025): people
 * who struggle with typing solve most of the coordination with one touch.
 */
const QUICK_REPLIES = [
  'Estou chegando',
  'Cheguei',
  'Pode me ligar?',
  'Vou me atrasar um pouco',
  'Tudo certo por aqui 👍',
];

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const strip = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((strip(today) - strip(date)) / 86_400_000);
  if (diff === 0) return 'HOJE';
  if (diff === 1) return 'ONTEM';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(date)
    .toUpperCase();
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

/** Chat — round 9, option B: classic bubbles + quick replies (docs/02 §9). */
export function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const { session } = useSession();
  const selfId = session?.user.id ?? DEMO_SELF_ID;

  const service = useServiceDetail(gigId);
  const messages = useMessages(gigId, true);
  const send = useSendMessage(gigId);
  const markRead = useMarkRead(gigId);

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const markReadRef = useRef(markRead.mutate);
  markReadRef.current = markRead.mutate;

  const count = messages.data?.length ?? 0;
  useEffect(() => {
    // Opening the chat (and every incoming message while open) clears the badge.
    markReadRef.current();
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [count]);

  const deliver = async (body: string) => {
    const text = body.trim();
    if (!text) return;
    setSendError(null);
    setDraft('');
    const result = await send.mutateAsync(text);
    if (result === 'not_allowed') {
      setSendError('Não é possível enviar mensagens nesta conversa.');
    } else if (result === 'network_error') {
      setSendError('A mensagem não foi enviada. Verifique sua conexão.');
    }
  };

  const groups: { label: string; items: GigMessage[] }[] = [];
  for (const message of messages.data ?? []) {
    const label = dayLabel(message.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(message);
    else groups.push({ label, items: [message] });
  }

  const counterpart = service.data?.counterpartName ?? 'Conversa';
  const start = service.data ? new Date(service.data.startsAt) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.column}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                  {counterpart}
                </Text>
                {service.data && start && (
                  <Text
                    style={[styles.headerSubtitle, { color: theme.onPrimaryMuted }]}
                    numberOfLines={1}>
                    {service.data.title} ·{' '}
                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric' }).format(
                      start,
                    )}
                  </Text>
                )}
              </View>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.isLoading && <ActivityIndicator color={theme.primary} />}
          {messages.isSuccess && count === 0 && (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              Combine os detalhes do serviço por aqui. As mensagens ficam guardadas e só vocês
              dois podem ver.
            </Text>
          )}

          {groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={[styles.day, { color: theme.textSecondary }]}>{group.label}</Text>
              {group.items.map((message) => {
                const mine = message.senderId === selfId;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.bubble,
                      mine
                        ? [styles.mine, { backgroundColor: theme.primary }]
                        : [styles.theirs, { backgroundColor: theme.backgroundElement }],
                    ]}>
                    <Text style={[styles.body, { color: mine ? theme.onPrimary : theme.text }]}>
                      {message.body}
                    </Text>
                    <Text
                      style={[
                        styles.time,
                        { color: mine ? theme.onPrimaryMuted : theme.textSecondary },
                      ]}>
                      {timeLabel(message.createdAt)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          {sendError && (
            <Text style={[styles.error, { color: theme.danger }]}>{sendError}</Text>
          )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRow}
          contentContainerStyle={styles.quickContent}
          keyboardShouldPersistTaps="handled">
          {QUICK_REPLIES.map((phrase) => (
            <Pressable
              key={phrase}
              accessibilityRole="button"
              disabled={send.isPending}
              onPress={() => deliver(phrase)}
              style={[
                styles.quickChip,
                { borderColor: theme.primary, backgroundColor: theme.primarySoft },
              ]}>
              <Text style={[styles.quickLabel, { color: theme.primarySoftText }]}>{phrase}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SafeAreaView edges={['bottom']}>
          <View style={[styles.inputBar, { borderTopColor: theme.line }]}>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
              ]}
              placeholder="Escreva uma mensagem…"
              placeholderTextColor={theme.textSecondary}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => deliver(draft)}
              multiline
              maxLength={1000}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              disabled={send.isPending || !draft.trim()}
              onPress={() => deliver(draft)}
              style={[
                styles.send,
                {
                  backgroundColor: draft.trim() ? theme.primary : theme.backgroundSelected,
                },
              ]}>
              <Ionicons
                name="send"
                size={16}
                color={draft.trim() ? theme.onPrimary : theme.textSecondary}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two + 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  group: {
    gap: Spacing.one,
  },
  day: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginVertical: Spacing.one,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.large - 2,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
  },
  mine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  theirs: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  body: {
    fontSize: 14,
    lineHeight: 19.5,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  error: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    padding: Spacing.two,
  },
  quickRow: {
    flexGrow: 0,
  },
  quickContent: {
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  quickChip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  quickLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
    fontSize: 14,
    maxHeight: 110,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
