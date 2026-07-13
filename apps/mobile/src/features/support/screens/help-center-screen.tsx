import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { FaqArticle } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ViAvatar } from '../components/vi-avatar';
import { useFaq } from '../hooks';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** The four categories shown up front; the rest hide behind "Outros assuntos". */
const PRIMARY_CATEGORIES = ['Pagamentos', 'Vagas'];

/**
 * Central de Ajuda — rodada 17, opção C (híbrido · D-045): a Vi em
 * destaque no topo, cards de perguntas frequentes, "Outros assuntos" com
 * as menos comuns e, no rodapé, "Falar com o suporte" (humano). A IA
 * resolve o comum; o humano só recebe o que sobra.
 */
export function HelpCenterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const faq = useFaq();
  const [showOthers, setShowOthers] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { primary, others } = useMemo(() => {
    const rows = faq.data ?? [];
    return {
      primary: rows.filter((a) => PRIMARY_CATEGORIES.includes(a.category)),
      others: rows.filter((a) => !PRIMARY_CATEGORIES.includes(a.category)),
    };
  }, [faq.data]);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  const openOthers = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowOthers((v) => !v);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
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
              <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  Central de Ajuda
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.onPrimaryMuted }]}>
                  a Vi resolve na hora · ou fale com a equipe
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Vi em destaque */}
          <View style={[styles.viBox, { backgroundColor: theme.primarySoft }]}>
            <View style={styles.viIntro}>
              <View style={styles.viAvatarWrap}>
                <ViAvatar size={26} variant="light" />
              </View>
              <Text style={[styles.viText, { color: theme.primarySoftText }]}>
                Oi! Sou a Vi 💜 Me conta sua dúvida que eu tento resolver na hora.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Conversar com a Vi"
              onPress={() => router.push('/help/vi')}
              style={[styles.viInput, { backgroundColor: theme.background, borderColor: theme.line }]}>
              <Text style={[styles.viInputPlaceholder, { color: theme.textSecondary }]}>
                Como posso ajudar?
              </Text>
              <View style={[styles.viSend, { backgroundColor: theme.primary }]}>
                <Ionicons name="send" size={13} color={theme.onPrimary} />
              </View>
            </Pressable>
          </View>

          {/* Perguntas frequentes */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            PERGUNTAS FREQUENTES
          </Text>

          {faq.isLoading && <ActivityIndicator color={theme.primary} style={styles.loading} />}

          {primary.map((article) => (
            <FaqCard
              key={article.id}
              article={article}
              open={openId === article.id}
              onToggle={() => toggle(article.id)}
              theme={theme}
            />
          ))}

          {/* Outros assuntos */}
          {others.length > 0 && (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={openOthers}
                style={[styles.othersToggle, { borderColor: theme.line }]}>
                <Text style={[styles.othersLabel, { color: theme.text }]}>Outros assuntos</Text>
                <Ionicons
                  name={showOthers ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.textSecondary}
                />
              </Pressable>
              {showOthers &&
                others.map((article) => (
                  <FaqCard
                    key={article.id}
                    article={article}
                    open={openId === article.id}
                    onToggle={() => toggle(article.id)}
                    theme={theme}
                  />
                ))}
            </>
          )}

          {/* Falar com o suporte (humano) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Falar com alguém do suporte"
            onPress={() => router.push('/help/vi?escalate=1')}
            style={[styles.human, { borderColor: theme.primary }]}>
            <Ionicons name="people-outline" size={17} color={theme.primarySoftText} />
            <Text style={[styles.humanLabel, { color: theme.primarySoftText }]}>
              Falar com alguém do suporte
            </Text>
          </Pressable>
          <Text style={[styles.humanHint, { color: theme.textSecondary }]}>
            A Vi tenta resolver primeiro. Se precisar, a equipe continua o atendimento por aqui
            mesmo.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

function FaqCard({
  article,
  open,
  onToggle,
  theme,
}: {
  article: FaqArticle;
  open: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={[styles.card, { borderColor: theme.line }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardQuestion, { color: theme.text }]}>{article.question}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textSecondary}
        />
      </View>
      {open && (
        <Text style={[styles.cardAnswer, { color: theme.textSecondary }]}>{article.answer}</Text>
      )}
    </Pressable>
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
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 11.5, marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  viBox: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.two },
  viIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  viAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viText: { flex: 1, fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  viInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
  },
  viInputPlaceholder: { flex: 1, fontSize: 13.5 },
  viSend: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  loading: { marginVertical: Spacing.two },
  card: { borderWidth: 1.5, borderRadius: Radius.medium, padding: Spacing.two + 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardQuestion: { flex: 1, fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  cardAnswer: { fontSize: 13, lineHeight: 19, marginTop: Spacing.two },
  othersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
  },
  othersLabel: { fontSize: 13.5, fontWeight: '700' },
  human: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 13,
    marginTop: Spacing.two,
  },
  humanLabel: { fontSize: 14, fontWeight: '800' },
  humanHint: { fontSize: 11.5, lineHeight: 16, textAlign: 'center', paddingHorizontal: Spacing.two },
});
