import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Minimal profile tab: shows who is signed in and lets the user sign in/out.
 * The full profile (reputation, completed services) gets its own design
 * round later (docs/02 §1).
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status, userName, session } = useSession();

  const initial = (userName ?? 'V').trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <Text style={[styles.avatarLabel, { color: theme.onPrimary }]}>{initial}</Text>
        </View>

        {status === 'signedIn' ? (
          <>
            <Text style={[styles.name, { color: theme.text }]}>{userName}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {session?.user.email}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              Avaliações e serviços concluídos aparecerão aqui.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => signOut()}
              style={[styles.button, { borderColor: theme.danger }]}>
              <Text style={[styles.buttonLabel, { color: theme.danger }]}>Sair da conta</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.name, { color: theme.text }]}>Você ainda não entrou</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {status === 'unconfigured'
                ? 'Modo demonstração: o servidor ainda não foi conectado, mas você pode conhecer a tela de entrada.'
                : 'Entre para anunciar vagas e aceitar serviços.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/auth')}
              style={[styles.button, styles.buttonFilled, { backgroundColor: theme.primary }]}>
              <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>
                Entrar ou criar conta
              </Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 26,
    fontWeight: '800',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.three,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderColor: 'transparent',
  },
  buttonFilled: {
    borderWidth: 0,
  },
  buttonLabel: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});
