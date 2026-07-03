import { StyleSheet, Text, View } from 'react-native';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProfileStats, useRecentReviews } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

export type ProfileRole = 'worker' | 'poster';

function stars(rating: number): string {
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

interface Props {
  userId: string | null;
  /** Chosen by the PLATFORM from context, never by a user toggle (D-011). */
  role: ProfileRole;
  fallbackName?: string;
}

/**
 * Reputation block reused by the own-profile tab and public profiles:
 * single prominent rating, review count and COMPLETED services for the
 * given role (never gigs posted — anti-manipulation, D-010/D-011),
 * followed by that role's reviews.
 */
export function ProfileView({ userId, role, fallbackName }: Props) {
  const theme = useTheme();
  const stats = useProfileStats(userId);
  const reviews = useRecentReviews(userId, role);

  const avg = role === 'worker' ? stats.data?.workerAvgRating : stats.data?.posterAvgRating;
  const reviewCount =
    role === 'worker' ? stats.data?.workerReviewCount : stats.data?.posterReviewCount;
  const completed =
    role === 'worker' ? stats.data?.completedAsWorker : stats.data?.completedAsPoster;
  const completedLabel = role === 'worker' ? 'serviços prestados' : 'serviços finalizados';

  return (
    <View style={styles.root}>
      <View style={[styles.ratingCard, { backgroundColor: theme.primarySoft }]}>
        <Text style={[styles.roleLabel, { color: theme.primarySoftMeta }]}>
          {role === 'worker' ? 'COMO PRESTADOR' : 'COMO ANUNCIANTE'}
        </Text>
        <Text style={[styles.bigRating, { color: theme.primarySoftText }]}>
          {avg != null
            ? `★ ${avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`
            : 'Sem nota ainda'}
        </Text>
        <Text style={[styles.ratingMeta, { color: theme.primarySoftMeta }]}>
          {reviewCount ?? 0} {(reviewCount ?? 0) === 1 ? 'avaliação' : 'avaliações'} ·{' '}
          {completed ?? 0} {completedLabel}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AVALIAÇÕES</Text>
      {reviews.data?.length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          {(fallbackName ?? 'Esta pessoa') + ' ainda não recebeu avaliações neste papel.'}
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
                <View key={tag} style={[styles.reviewTag, { backgroundColor: theme.primarySoft }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two + 2,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  ratingCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 3,
  },
  roleLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  empty: {
    fontSize: 12.5,
    lineHeight: 18,
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
});
