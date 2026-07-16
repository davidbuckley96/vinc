import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ViAvatar } from '../components/vi-avatar';
import { useVi } from '../hooks';

const GREETING =
  'Oi! Sou a Vi 💜 Me conta sua dúvida que eu tento resolver na hora. ' +
  'Posso ajudar com pagamentos, vagas, saques e mais.';

/**
 * Conversa com a Vi (docs/09 S3 · D-045). Bolhas como o chat de serviço,
 * mas com a assistente: ela resolve o comum e, quando não dá conta ou
 * você pede, encaminha para a equipe (o ticket vira "aguardando suporte").
 */
export function ViChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const vi = useVi();
  const { escalate } = useLocalSearchParams<{ escalate?: string }>();

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Arrived via "Falar com o suporte": send the human request once, so the
  // ticket goes straight to the queue (banner + waiting_support).
  const escalatedRef = useRef(false);
  useEffect(() => {
    if (escalate !== '1' || escalatedRef.current) return;
    if (vi.isLoadingHistory) return;
    if (vi.status === 'waiting_support') {
      escalatedRef.current = true;
      return;
    }
    escalatedRef.current = true;
    vi.send('Quero falar com alguém do suporte.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalate, vi.isLoadingHistory, vi.status]);

  const count = vi.thread.length;
  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [count, vi.thinking]);

  const deliver = (body: string) => {
    const text = body.trim();
    if (!text || vi.isSending) return;
    setDraft('');
    vi.send(text);
  };

  const waiting = vi.status === 'waiting_support';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.column}
        behavior="padding">
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => router.back()}
                style={styles.back}>
                <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              </Pressable>
              <View style={styles.headerAvatar}>
                <ViAvatar size={34} variant="light" />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Vi</Text>
                <Text style={[styles.headerSubtitle, { color: theme.onPrimaryMuted }]}>
                  {waiting ? 'na fila para a equipe' : 'assistente do Vinc · responde na hora'}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {vi.isLoadingHistory && <ActivityIndicator color={theme.primary} />}

          {/* Greeting is always the first bubble, even before any ticket. */}
          <Bubble sender="ai" body={GREETING} theme={theme} />

          {vi.thread.map((turn) => (
            <Bubble key={turn.id} sender={turn.sender} body={turn.body} theme={theme} />
          ))}

          {vi.thinking && (
            <View style={styles.thinkingRow}>
              <View style={[styles.aiAvatar, { backgroundColor: theme.primarySoft }]}>
                <ViAvatar size={18} variant="light" />
              </View>
              <View style={[styles.bubble, styles.theirs, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.thinking, { color: theme.textSecondary }]}>Digitando…</Text>
              </View>
            </View>
          )}

          {vi.sendError && <Text style={[styles.error, { color: theme.danger }]}>{vi.sendError}</Text>}
        </ScrollView>

        {waiting && (
          <View style={[styles.banner, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="people" size={15} color={theme.primarySoftText} />
            <View style={styles.bannerBody}>
              <Text style={[styles.bannerText, { color: theme.primarySoftText }]}>
                Você está na fila para falar com a equipe. Pode escrever aqui mesmo — a Vi
                continua ajudando enquanto isso.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sair da fila e encerrar o atendimento"
                disabled={vi.isLeavingQueue}
                onPress={vi.leaveQueue}
                style={styles.leaveQueue}>
                <Text style={[styles.leaveQueueText, { color: theme.primarySoftText }]}>
                  {vi.isLeavingQueue ? 'Encerrando…' : 'Já resolvi / sair da fila'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <SafeAreaView edges={['bottom']}>
          <View style={[styles.inputBar, { borderTopColor: theme.line }]}>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
              ]}
              placeholder="Escreva sua dúvida…"
              placeholderTextColor={theme.textSecondary}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => deliver(draft)}
              multiline
              maxLength={2000}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              disabled={vi.isSending || !draft.trim()}
              onPress={() => deliver(draft)}
              style={[
                styles.send,
                { backgroundColor: draft.trim() ? theme.primary : theme.backgroundSelected },
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

function Bubble({
  sender,
  body,
  theme,
}: {
  sender: 'user' | 'ai' | 'agent';
  body: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const mine = sender === 'user';
  if (mine) {
    return (
      <View style={[styles.bubble, styles.mine, { backgroundColor: theme.primary }]}>
        <Text style={[styles.body, { color: theme.onPrimary }]}>{body}</Text>
      </View>
    );
  }
  return (
    <View style={styles.aiRow}>
      <View style={[styles.aiAvatar, { backgroundColor: theme.primarySoft }]}>
        <ViAvatar size={18} variant="light" />
      </View>
      <View style={[styles.bubble, styles.theirs, { backgroundColor: theme.backgroundElement }]}>
        {sender === 'agent' && (
          <Text style={[styles.agentTag, { color: theme.primarySoftText }]}>EQUIPE VINC</Text>
        )}
        <Text style={[styles.body, { color: theme.text }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: { borderBottomLeftRadius: Radius.xlarge, borderBottomRightRadius: Radius.xlarge },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  back: { padding: 2 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 11.5, marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one, maxWidth: '86%' },
  thinkingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    borderRadius: Radius.large - 2,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.two,
  },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 5, maxWidth: '82%' },
  theirs: { flex: 1, borderBottomLeftRadius: 5 },
  agentTag: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  body: { fontSize: 14, lineHeight: 19.5 },
  thinking: { fontSize: 13, fontStyle: 'italic' },
  error: { fontSize: 12.5, fontWeight: '600', textAlign: 'center', padding: Spacing.two },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.one,
    padding: Spacing.two + 2,
    borderRadius: Radius.medium,
  },
  bannerBody: { flex: 1, gap: 6 },
  bannerText: { fontSize: 12, lineHeight: 16 },
  leaveQueue: { alignSelf: 'flex-start' },
  leaveQueueText: { fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
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
