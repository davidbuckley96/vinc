import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ReportSheet, type ReportReason } from '@/components/report-sheet';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProfileStats, useRecentReviews, useReportReview } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

export type ProfileRole = 'worker' | 'poster';

const REVIEW_REPORT_REASONS: ReportReason[] = [
  { key: 'injusta', label: 'Injusta ou mentirosa' },
  { key: 'ofensiva', label: 'Ofensiva, vulgar ou com xingamento' },
  { key: 'nao_relacionada', label: 'Não é sobre este serviço' },
  { key: 'outro', label: 'Outro motivo' },
];

function stars(rating: number): string {
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

interface Props {
  userId: string | null;
  /** Kept for callers/navigation context; the rating shown is always the
   *  unified one (prestador + anunciante) — D-052. */
  role?: ProfileRole;
  fallbackName?: string;
}

/**
 * Reputation block reused by the own-profile tab and public profiles:
 * ONE general rating (worker + poster combined — D-052), the totals of
 * services done, gigs posted and reviews, then every review with a
 * "denunciar" action for unfair/offensive ones.
 */
export function ProfileView({ userId, fallbackName }: Props) {
  const theme = useTheme();
  const stats = useProfileStats(userId);
  const reviews = useRecentReviews(userId); // both roles (unified)
  const reportReview = useReportReview();

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const avg = stats.data?.avgRating;
  const reviewCount = stats.data?.reviewCount ?? 0;
  const servicesDone = stats.data?.completedAsWorker ?? 0;
  const gigsPosted = stats.data?.completedAsPoster ?? 0;

  const onReport = async (category: string, detail: string) => {
    const id = reportingId;
    if (!id) return;
    const label = REVIEW_REPORT_REASONS.find((r) => r.key === category)?.label ?? 'Denúncia';
    const result = await reportReview.mutateAsync({ reviewId: id, category, reason: detail || label });
    setReportingId(null);
    if (result !== 'error') setReportedIds((prev) => new Set(prev).add(id));
  };

  return (
    <View style={styles.root}>
      <View style={[styles.ratingCard, { backgroundColor: theme.primarySoft }]}>
        <Text style={[styles.roleLabel, { color: theme.primarySoftMeta }]}>AVALIAÇÃO GERAL</Text>
        <Text style={[styles.bigRating, { color: theme.primarySoftText }]}>
          {avg != null
            ? `★ ${avg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`
            : 'Sem nota ainda'}
        </Text>
        <View style={styles.totalsRow}>
          <Totals value={reviewCount} label={reviewCount === 1 ? 'avaliação' : 'avaliações'} theme={theme} />
          <View style={[styles.totalsDivider, { backgroundColor: theme.primarySoftMeta }]} />
          <Totals value={servicesDone} label={servicesDone === 1 ? 'serviço' : 'serviços'} theme={theme} />
          <View style={[styles.totalsDivider, { backgroundColor: theme.primarySoftMeta }]} />
          <Totals value={gigsPosted} label={gigsPosted === 1 ? 'vaga' : 'vagas'} theme={theme} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AVALIAÇÕES</Text>
      {reviews.data?.length === 0 && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          {(fallbackName ?? 'Esta pessoa') + ' ainda não recebeu avaliações.'}
        </Text>
      )}
      {reviews.data?.map((review) => (
        <View key={review.id} style={[styles.review, { borderBottomColor: theme.line }]}>
          <View style={styles.reviewHeader}>
            <Text style={[styles.reviewName, { color: theme.text }]}>{review.reviewerName}</Text>
            <Text style={styles.reviewStars}>{stars(review.rating)}</Text>
          </View>
          {review.tags.length > 0 && (
            <View style={styles.reviewTags}>
              {review.tags.map((tag) => (
                <View key={tag} style={[styles.reviewTag, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.reviewTagLabel, { color: theme.primarySoftText }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {review.comment && (
            <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>
              {review.comment}
            </Text>
          )}
          {reportedIds.has(review.id) ? (
            <Text style={[styles.reportDone, { color: theme.textSecondary }]}>
              Denúncia enviada — a equipe vai avaliar.
            </Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setReportingId(review.id)}
              hitSlop={8}
              style={styles.reportLink}>
              <Text style={[styles.reportLinkLabel, { color: theme.textSecondary }]}>
                🚩 Denunciar avaliação
              </Text>
            </Pressable>
          )}
        </View>
      ))}

      <ReportSheet
        visible={reportingId !== null}
        title="Denunciar avaliação"
        reasons={REVIEW_REPORT_REASONS}
        pending={reportReview.isPending}
        onSubmit={onReport}
        onClose={() => setReportingId(null)}
      />
    </View>
  );
}

function Totals({
  value,
  label,
  theme,
}: {
  value: number;
  label: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.totalsItem}>
      <Text style={[styles.totalsValue, { color: theme.primarySoftText }]}>{value}</Text>
      <Text style={[styles.totalsLabel, { color: theme.primarySoftMeta }]}>{label}</Text>
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
    gap: 6,
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
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  totalsItem: {
    alignItems: 'center',
    minWidth: 58,
  },
  totalsValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  totalsLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  totalsDivider: {
    width: 1,
    height: 26,
    opacity: 0.4,
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
  reportLink: {
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  reportLinkLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  reportDone: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },
});
