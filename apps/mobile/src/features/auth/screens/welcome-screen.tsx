import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VincLogo } from '@/components/vinc-logo';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { markWelcomeSeen } from '../welcome-seen';

/**
 * First-run screen — rodada 18, opção B ("o que você quer agora?", D-048):
 * action-first. Two big choices route straight to the first action
 * (anunciar × buscar), with the essential facts on the card. Shown once,
 * right after the account is complete.
 */
export function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();

  const name = (session?.user.user_metadata?.name as string | undefined)?.split(' ')[0];

  const go = (path: '/post' | '/search' | '/') => {
    markWelcomeSeen(session?.user.id);
    router.replace(path);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerInner}>
              <View style={styles.logo}>
                <VincLogo size={44} />
              </View>
              <Text style={[styles.hi, { color: theme.onPrimary }]}>
                {name ? `Oi, ${name}! 👋` : 'Bem-vindo ao Vinc! 👋'}
              </Text>
              <Text style={[styles.sub, { color: theme.onPrimaryMuted }]}>
                O que você quer fazer agora?
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Choice
            theme={theme}
            primary
            icon="megaphone"
            title="Quero contratar um serviço"
            subtitle="Anuncie o que precisa e escolha quem faz. Publicar é grátis."
            onPress={() => go('/post')}
          />
          <Choice
            theme={theme}
            icon="briefcase"
            title="Quero fazer bicos e ganhar dinheiro"
            subtitle="Encontre serviços perto de você e receba pelo app."
            onPress={() => go('/search')}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => go('/')}
            style={styles.later}
            hitSlop={10}>
            <Text style={[styles.laterText, { color: theme.textSecondary }]}>Depois eu vejo</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Choice({
  theme,
  icon,
  title,
  subtitle,
  onPress,
  primary,
}: {
  theme: ReturnType<typeof useTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: primary ? theme.primary : theme.line,
          backgroundColor: primary ? theme.primarySoft : theme.background,
        },
      ]}>
      <View style={[styles.cardIcon, { backgroundColor: theme.background }]}>
        <Ionicons name={icon} size={26} color={theme.primary} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: {
    borderBottomLeftRadius: Radius.xlarge,
    borderBottomRightRadius: Radius.xlarge,
  },
  headerInner: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.one,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  hi: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 13.5, marginTop: 2 },
  body: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 2,
    borderRadius: Radius.large + 2,
    padding: Spacing.three,
  },
  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: Radius.large - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  cardSub: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  later: { alignSelf: 'center', paddingVertical: Spacing.two, marginTop: Spacing.one },
  laterText: { fontSize: 13.5, fontWeight: '700' },
});
