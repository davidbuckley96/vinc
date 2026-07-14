import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/session-context';
import { useProfileStats } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

import { MyActivity } from '../components/my-activity';
import { ProfileView } from '../components/profile-view';
import { useMyProfile } from '../hooks';

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
  const profile = useMyProfile();
  const bio = profile.data?.bio?.trim();

  const role =
    (stats.data?.completedAsPoster ?? 0) > (stats.data?.completedAsWorker ?? 0)
      ? 'poster'
      : 'worker';

  const name = stats.data?.name ?? userName ?? 'Visitante';
  const initial = name.trim().charAt(0).toUpperCase();
  const avatarUrl = stats.data?.avatarUrl ?? null;
  const city = stats.data?.city ?? null;
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
            {/* Layout A (D-064): foto grande sobreposta ao cabeçalho roxo. */}
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft, borderColor: theme.background }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={[styles.avatarLabel, { color: theme.primarySoftText }]}>
                  {initial}
                </Text>
              )}
            </View>
            <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
            {!!city && (
              <View style={styles.cityRow}>
                <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.meta, { color: theme.textSecondary }]}>{city}</Text>
              </View>
            )}
            {session?.user.email && (
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {session.user.email}
              </Text>
            )}
            {!!bio && <Text style={[styles.bio, { color: theme.text }]}>{bio}</Text>}
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
                  accessibilityLabel="Alertas de vagas"
                  onPress={() => router.push('/alerts')}
                  style={[styles.alertsCard, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
                  <Ionicons name="notifications" size={20} color={theme.primarySoftText} />
                  <View style={styles.alertsText}>
                    <Text style={[styles.alertsTitle, { color: theme.primarySoftText }]}>
                      Alertas de vagas
                    </Text>
                    <Text style={[styles.alertsHint, { color: theme.primarySoftMeta }]}>
                      Avisamos quando surgir uma vaga do seu jeito.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.primarySoftMeta} />
                </Pressable>
              )}
              {status === 'signedIn' && <MyActivity />}
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
                    Minha chave Pix
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
    // Extra purple area below the title acts as the profile "cover" (layout A),
    // so the photo can overlap it.
    paddingBottom: Spacing.four,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
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
    marginTop: -46, // pull the photo up so it overlaps the purple header (layout A)
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    fontSize: 32,
    fontWeight: '800',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  bio: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
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
  alertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radius.large - 2,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  alertsText: { flex: 1, gap: 1 },
  alertsTitle: { fontSize: 14, fontWeight: '800' },
  alertsHint: { fontSize: 11.5, lineHeight: 15 },
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
