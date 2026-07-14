import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Candidate, DecideCandidacyOutcome } from '@vinc/api';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useCandidates, useDecideCandidacy } from '../hooks';

interface CandidateListProps {
  gigId: string;
  /** Poster viewing their own OPEN gig. */
  enabled: boolean;
}

/**
 * Round 8, option A (D-024): comparable anonymized candidate cards — same
 * info in the same order on every card (first name, worker rating,
 * completed services, top praise tags), choose/refuse inline. No photo,
 * no full name, no profile link until someone is chosen.
 */
export function CandidateList({ gigId, enabled }: CandidateListProps) {
  const theme = useTheme();
  const router = useRouter();
  const candidates = useCandidates(gigId, enabled);
  const decision = useDecideCandidacy(gigId);

  const [refuseArmedId, setRefuseArmedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  if (!enabled) return null;

  const decide = async (candidate: Candidate, action: 'choose' | 'refuse') => {
    if (action === 'refuse' && refuseArmedId !== candidate.candidacyId) {
      setRefuseArmedId(candidate.candidacyId);
      return;
    }
    setRefuseArmedId(null);
    setFeedback(null);
    const outcome: DecideCandidacyOutcome = await decision.mutateAsync({
      candidacyId: candidate.candidacyId,
      action,
    });
    const result = outcome.code;
    if (result === 'chosen_pending_payment' && outcome.gigId) {
      // D-040: the choice holds for 30 min — pay the Pix to confirm it.
      router.push(`/pay/${outcome.gigId}`);
      return;
    }
    if (result === 'chosen') {
      setFeedback({
        kind: 'success',
        text: `${candidate.firstName} vai fazer o serviço! Agora vocês podem ver o perfil um do outro.`,
      });
    } else if (result === 'refused') {
      setFeedback({
        kind: 'success',
        text: `Candidatura de ${candidate.firstName} recusada.`,
      });
    } else if (result === 'candidate_unavailable') {
      setFeedback({
        kind: 'error',
        text: `${candidate.firstName} ficou com o horário ocupado e saiu da lista.`,
      });
    } else {
      setFeedback({ kind: 'error', text: 'Não foi possível responder agora. Tente de novo.' });
    }
  };

  const list = candidates.data ?? [];

  return (
    <View style={styles.block}>
      {candidates.isLoading && <ActivityIndicator color={theme.primary} />}

      {candidates.isSuccess && list.length === 0 && !feedback && (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          Nenhum candidato ainda. Você será avisado quando alguém se candidatar.
        </Text>
      )}

      {list.length > 0 && (
        <View style={[styles.banner, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.bannerTitle, { color: theme.primarySoftText }]}>
            {list.length === 1
              ? '1 candidato quer fazer o serviço'
              : `${list.length} candidatos querem fazer o serviço`}
          </Text>
          <Text style={[styles.bannerBody, { color: theme.primarySoftMeta }]}>
            compare e escolha — a vaga continua aberta enquanto isso
          </Text>
        </View>
      )}

      {list.map((candidate) => {
        const refuseArmed = refuseArmedId === candidate.candidacyId;
        return (
          <View
            key={candidate.candidacyId}
            style={[styles.card, { borderColor: theme.line, backgroundColor: theme.background }]}>
            <View style={styles.cardTop}>
              <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                {candidate.avatarUrl ? (
                  <Image
                    source={{ uri: candidate.avatarUrl }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="person" size={19} color={theme.primarySoftText} />
                )}
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.text }]}>{candidate.firstName}</Text>
                  {candidate.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.priorityLabel, { color: theme.primarySoftText }]}>
                        ⚡ Destaque
                      </Text>
                    </View>
                  )}
                  {candidate.reviewCount === 0 && (
                    <View style={[styles.newBadge, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.priorityLabel, { color: theme.primarySoftText }]}>
                        🌱 Novo usuário
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {candidate.reviewCount > 0 && candidate.avgRating !== null
                    ? `★ ${candidate.avgRating.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} (${candidate.reviewCount} ${candidate.reviewCount === 1 ? 'avaliação' : 'avaliações'}) · ${candidate.completedServices} serviços`
                    : '★ 5,0 · ainda sem avaliações'}
                </Text>
                {candidate.priority && (
                  <Text style={[styles.priorityHint, { color: theme.primarySoftMeta }]}>
                    teve um serviço cancelado neste mesmo horário
                  </Text>
                )}
              </View>
            </View>

            {candidate.topTags.length > 0 && (
              <View style={styles.tags}>
                {candidate.topTags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.tagLabel, { color: theme.primarySoftMeta }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={decision.isPending}
                onPress={() => decide(candidate, 'choose')}
                style={[
                  styles.choose,
                  { backgroundColor: theme.primary, opacity: decision.isPending ? 0.7 : 1 },
                ]}>
                <Text style={[styles.chooseLabel, { color: theme.onPrimary }]}>
                  Escolher {candidate.firstName}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={decision.isPending}
                onPress={() => decide(candidate, 'refuse')}
                style={[
                  styles.refuse,
                  {
                    borderColor: refuseArmed ? theme.danger : theme.line,
                    backgroundColor: refuseArmed ? theme.danger : theme.background,
                  },
                ]}>
                <Text
                  style={[
                    styles.refuseLabel,
                    { color: refuseArmed ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  {refuseArmed ? 'Confirmar' : 'Recusar'}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {feedback && (
        <Text
          style={[
            styles.feedback,
            { color: feedback.kind === 'error' ? theme.danger : theme.success },
          ]}>
          {feedback.text}
        </Text>
      )}

      {list.length > 0 && (
        <Text style={[styles.privacyNote, { color: theme.textSecondary }]}>
          O nome completo e o contato aparecem só depois da escolha. Escolha pela
          reputação e pelas avaliações.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  banner: {
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    alignItems: 'center',
    gap: 2,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  bannerBody: {
    fontSize: 11.5,
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18.5,
    paddingHorizontal: Spacing.two,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.large - 2,
    padding: Spacing.two + 4,
    gap: Spacing.two - 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  priorityBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityLabel: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  priorityHint: {
    fontSize: 11,
    marginTop: 1,
  },
  meta: {
    fontSize: 12,
    marginTop: 1,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tag: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two - 2,
    marginTop: 2,
  },
  choose: {
    flex: 1.4,
    borderRadius: Radius.medium,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chooseLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  refuse: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 10,
    alignItems: 'center',
  },
  refuseLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  feedback: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18.5,
  },
  privacyNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.two,
  },
});
