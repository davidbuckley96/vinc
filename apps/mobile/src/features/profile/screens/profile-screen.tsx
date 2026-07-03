import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/session-context';
import { useProfileStats, useRecentReviews } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

type ProfileRole = 'worker' | 'poster';

function stars(rating: number): string {
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

/**
 * Profile — single prominent rating in two switchable versions,
 * Prestador × Anunciante (D-010). Each version shows only that role's
 * average, reviews and COMPLETED services. Never show how many gigs were
 * posted (anti-manipulation: posting + cancelling must not inflate numbers).
 */
export function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status, userName, session } = useSession();
  const userId = session?.user.id ?? null;
  const [role, setRole] = useState<ProfileRole>('worker');
  const stats = useProfileStats(userId);
  const reviews = useRecentReviews(userId, role);

  const name = stats.data?.name ?? userName ?? 'Visitante';
  const initial = name.trim().charAt(0).toUpperCase();
  const signedOut = status === 'signedOut';

  const avg = role === 'worker' ? stats.data?.workerAvgRating : stats.data?.posterAvgRating;
  const reviewCount =
    role === 'worker' ? stats.data?.workerReviewCount : stats.data?.posterReviewCount;
  const completed =
    role === 'worker' ? stats.data?.completedAsWorker : stats.data?.completedAsPoster;
  const completedLabel =
    role === 'worker' ? 'serviços prestados' : 'serviços finalizados';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Perfil</Text>
            {!signedOut && (
              <View style={styles.switcher}>
                {(
                  [
                    { key: 'worker', label: 'Prestador' },
                    { key: 'poster', label: 'Anunciante' },
                  ] as const
                ).map((option) => {
                  const selected = role === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setRole(option.key)}
                      style={[
                        styles.switchOption,
                        selected && { backgroundColor: theme.background },
                      ]}>
                      <Text
                        style={[
                          styles.switchLabel,
                          { color: selected ? theme.primary : theme.onPrimaryMuted },
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
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
              {stats.isLoading && <ActivityIndicator color={theme.primary} />}
              {stats.data && (
                <View style={[styles.ratingCard, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.bigRating, { color: theme.primarySoftText }]}>
                    {avg != null
                      ? `★ ${avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`
                      : 'Sem nota ainda'}
                  </Text>
                  <Text style={[styles.ratingMeta, { color: theme.primarySoftMeta }]}>
                    {reviewCount ?? 0}{' '}
                    {(reviewCount ?? 0) === 1 ? 'avaliação' : 'avaliações'} ·{' '}
                    {completed ?? 0} {completedLabel}
                  </Text>
                </View>
              )}

              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {role === 'worker'
                  ? 'AVALIAÇÕES COMO PRESTADOR'
                  : 'AVALIAÇÕES COMO ANUNCIANTE'}
              </Text>
              {reviews.data?.length === 0 && (
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {role === 'worker'
                    ? 'Você ainda não recebeu avaliações como prestador. Aceite e conclua serviços para construir sua reputação!'
                    : 'Você ainda não recebeu avaliações como anunciante. Anuncie vagas e confirme as conclusões para construir sua reputação!'}
                </Text>
              )}
              {reviews.data?.map((review) => (
                <View key={review.id} style={[styles.review, { borderBottomColor: theme.line }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewName, { color: theme.text }]}>
                      {review.reviewerName}
                    </Text>
                    <Text style={styles.reviewStars}>{stars(review.rating)}</Text>
                  </View>
                  {review.tags.length > 0 && (
                    <View style={styles.reviewTags}>
                      {review.tags.map((tag) => (
                        <View
                          key={tag}
                          style={[styles.reviewTag, { backgroundColor: theme.primarySoft }]}>
                          <Text style={[styles.reviewTagLabel, { color: theme.primarySoftText }]}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {review.comment && (
                    <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>
                      {review.comment}
                    </Text>
                  )}
                </View>
              ))}

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
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.medium,
    padding: 3,
    marginHorizontal: Spacing.three,
  },
  switchOption: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.small + 1,
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
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
  ratingCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 3,
  },
  bigRating: {
    fontSize: 30,
    fontWeight: '800',
  },
  ratingMeta: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  review: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.two + 1,
    gap: 5,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  reviewStars: {
    fontSize: 12.5,
    color: '#F59E0B',
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  reviewTag: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  reviewTagLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: 12.5,
    lineHeight: 18,
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
