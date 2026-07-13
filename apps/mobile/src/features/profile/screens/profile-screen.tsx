import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/session-context';
import { useProfileStats } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

import { ProfileView } from '../components/profile-view';

/**
 * Own profile tab. The platform picks which version to show (D-011): the
 * role with more completed services; tie goes to prestador.
 */
export function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status, userName, session } = useSession();
  const userId = session?.user.id ?? null;
  const stats = useProfileStats(userId);

  const role =
    (stats.data?.completedAsPoster ?? 0) > (stats.data?.completedAsWorker ?? 0)
      ? 'poster'
      : 'worker';

  const name = stats.data?.name ?? userName ?? 'Visitante';
  const initial = name.trim().charAt(0).toUpperCase();
  const signedOut = status === 'signedOut';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Perfil</Text>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.who}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.avatarLabel, { color: theme.primarySoftText }]}>
                {initial}
              </Text>
            </View>
            <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
            {session?.user.email && (
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {session.user.email}
              </Text>
            )}
          </View>

          {signedOut ? (
            <>
              <Text style={[styles.meta, { color: theme.textSecondary, textAlign: 'center' }]}>
                Entre para ver sua reputação, avaliações e serviços concluídos.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/auth')}
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                <Text style={[styles.primaryButtonLabel, { color: theme.onPrimary }]}>
                  Entrar ou criar conta
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <ProfileView userId={userId} role={role} fallbackName="Você" />
              {status === 'signedIn' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/edit-profile')}
                  style={[styles.payoutEntry, { borderColor: theme.line }]}>
                  <Ionicons name="person-outline" size={17} color={theme.primary} />
                  <Text style={[styles.payoutEntryLabel, { color: theme.text }]}>
                    Editar perfil
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
              {status === 'signedIn' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/payout')}
                  style={[styles.payoutEntry, { borderColor: theme.line }]}>
                  <Ionicons name="key-outline" size={17} color={theme.primary} />
                  <Text style={[styles.payoutEntryLabel, { color: theme.text }]}>
                    Receber pagamentos (chave Pix)
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
              {status === 'signedIn' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/help')}
                  style={[styles.payoutEntry, { borderColor: theme.line }]}>
                  <Ionicons name="help-circle-outline" size={17} color={theme.primary} />
                  <Text style={[styles.payoutEntryLabel, { color: theme.text }]}>
                    Central de Ajuda
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
              {status === 'signedIn' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => signOut()}
                  style={[styles.signOut, { borderColor: theme.danger }]}>
                  <Ionicons name="log-out-outline" size={16} color={theme.danger} />
                  <Text style={[styles.signOutLabel, { color: theme.danger }]}>
                    Sair da conta
                  </Text>
                </Pressable>
              )}
            </>
          )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  who: {
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.one,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '800',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  meta: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: Radius.medium,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  payoutEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  payoutEntryLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 11,
    marginTop: Spacing.three,
  },
  signOutLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
