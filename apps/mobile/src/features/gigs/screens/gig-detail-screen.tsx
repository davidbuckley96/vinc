import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import type { ApplyGigResult } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { LocationModal } from '@/components/location-map';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import {
  useApplyGig,
  useCategories,
  useGig,
  useMyCandidacy,
  useMyPriority,
  useWithdrawCandidacy,
} from '../hooks';

const RESULT_MESSAGES: Record<Exclude<ApplyGigResult, 'applied'>, string> = {
  already_applied: 'Você já se candidatou a esta vaga.',
  unauthorized: 'Entre na sua conta para se candidatar.',
  not_found: 'Esta vaga não existe mais.',
  own_gig: 'Esta vaga foi anunciada por você.',
  not_available: 'Esta vaga não está mais disponível.',
  refused_before: 'O anunciante recusou sua candidatura para esta vaga.',
  blocked: 'Não é possível se candidatar a vagas deste anunciante.',
  schedule_conflict: 'Você já tem um compromisso nesse horário.',
  invalid_request: 'Algo deu errado. Tente de novo.',
  network_error: 'Sem conexão. Verifique sua internet e tente de novo.',
};

/** State line for a candidacy the worker already sent (D-024). */
const CANDIDACY_MESSAGES: Record<string, string> = {
  pending: 'Candidatura enviada — o anunciante está escolhendo. Você pode se candidatar a outras vagas enquanto isso.',
  refused: 'O anunciante recusou sua candidatura para esta vaga.',
  not_chosen: 'Outra pessoa foi escolhida para esta vaga.',
  chosen: 'Você foi escolhido para esta vaga! Veja na sua agenda.',
};

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Gig detail with the one-tap candidacy (docs/02 §3 — D-024). */
export function GigDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status } = useSession();
  const gig = useGig(id);
  const categories = useCategories();
  const apply = useApplyGig();
  const myCandidacy = useMyCandidacy(id);
  const myPriority = useMyPriority(id, gig.data?.startsAt, gig.data?.endsAt);
  const [mapOpen, setMapOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [applied, setApplied] = useState(false);
  const withdraw = useWithdrawCandidacy(id);
  const [withdrawArmed, setWithdrawArmed] = useState(false);

  // Withdraw a pending candidacy (D-039): no penalty, re-apply allowed.
  const onWithdraw = async () => {
    setFeedback(null);
    if (!withdrawArmed) {
      setWithdrawArmed(true);
      return;
    }
    setWithdrawArmed(false);
    const result = await withdraw.mutateAsync();
    if (result === 'withdrawn') {
      setApplied(false);
      setFeedback({
        kind: 'success',
        text: 'Você desistiu desta vaga. Se mudar de ideia, pode se candidatar de novo enquanto ela estiver aberta.',
      });
    } else {
      setFeedback({
        kind: 'error',
        text:
          result === 'not_pending'
            ? 'Sua candidatura já foi decidida — veja o serviço na sua agenda.'
            : 'Não foi possível desistir agora. Tente de novo.',
      });
    }
  };

  const onApply = async () => {
    setFeedback(null);
    if (status === 'signedOut') {
      router.push('/auth');
      return;
    }
    const result = await apply.mutateAsync(id);
    if (result === 'applied') {
      setApplied(true);
      setFeedback({
        kind: 'success',
        text:
          status === 'unconfigured'
            ? 'Modo demonstração: sua candidatura seria enviada agora.'
            : `Candidatura enviada! ${gig.data?.posterName ?? 'O anunciante'} vai comparar os candidatos e escolher.`,
      });
    } else {
      setFeedback({ kind: 'error', text: RESULT_MESSAGES[result] });
    }
  };

  const start = gig.data ? new Date(gig.data.startsAt) : null;
  const end = gig.data ? new Date(gig.data.endsAt) : null;
  const categoryName = categories.data?.find(
    (item) => item.id === gig.data?.categoryId,
  )?.name;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Detalhes da vaga</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        {gig.isLoading && <ActivityIndicator color={theme.primary} style={styles.loading} />}
        {(gig.isError || (gig.isSuccess && !gig.data)) && (
          <Text style={[styles.feedback, { color: theme.danger, padding: Spacing.four }]}>
            Não foi possível carregar esta vaga.
          </Text>
        )}

        {gig.data && start && end && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {categoryName && (
              <Text style={[styles.category, { color: theme.primarySoftMeta }]}>
                {categoryName.toUpperCase()}
              </Text>
            )}
            <Text style={[styles.title, { color: theme.text }]}>{gig.data.title}</Text>
            <Text style={[styles.price, { color: theme.primary }]}>
              {formatBRL(gig.data.priceCents)}
            </Text>

            <View style={[styles.infoBox, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.infoLine, { color: theme.primarySoftText }]}>
                📅 {WEEKDAYS[start.getDay()]}, {start.getDate()} · {start.getHours()}h às{' '}
                {end.getHours()}h
              </Text>
              {gig.data.approxLat !== null && gig.data.approxLng !== null ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver a região no mapa"
                    onPress={() => setMapOpen(true)}>
                    <Text style={[styles.infoLine, styles.infoLink, { color: theme.primarySoftText }]}>
                      📍 {gig.data.area} ›
                    </Text>
                  </Pressable>
                  <LocationModal
                    visible={mapOpen}
                    lat={gig.data.approxLat}
                    lng={gig.data.approxLng}
                    address={gig.data.area}
                    approximate
                    onClose={() => setMapOpen(false)}
                  />
                </>
              ) : (
                <Text style={[styles.infoLine, { color: theme.primarySoftText }]}>
                  📍 {gig.data.area}
                </Text>
              )}
              <Text style={[styles.infoNote, { color: theme.primarySoftMeta }]}>
                O endereço exato aparece quando você é escolhido.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver perfil de ${gig.data.posterName}`}
                onPress={() =>
                  router.push(
                    `/user/${gig.data!.posterId}?role=poster&name=${encodeURIComponent(gig.data!.posterName)}`,
                  )
                }>
                <Text style={[styles.infoLine, { color: theme.primarySoftText }]}>
                  👤 Anunciado por{' '}
                  <Text style={styles.posterLink}>{gig.data.posterName}</Text> ›
                </Text>
              </Pressable>
            </View>

            {gig.data.description ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  O QUE PRECISA SER FEITO
                </Text>
                <Text style={[styles.description, { color: theme.text }]}>
                  {gig.data.description}
                </Text>
              </>
            ) : null}

            {feedback && (
              <Text
                style={[
                  styles.feedback,
                  { color: feedback.kind === 'error' ? theme.danger : theme.success },
                ]}>
                {feedback.text}
              </Text>
            )}

            {applied || (myCandidacy.data && myCandidacy.data !== 'refused') ? (
              <>
                {!feedback && myCandidacy.data && (
                  <Text style={[styles.feedback, { color: theme.success }]}>
                    {CANDIDACY_MESSAGES[myCandidacy.data]}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/')}
                  style={[styles.accept, { backgroundColor: theme.success }]}>
                  <Text style={[styles.acceptLabel, { color: theme.onPrimary }]}>
                    Ver na minha agenda
                  </Text>
                </Pressable>
                {(applied || myCandidacy.data === 'pending') && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={withdraw.isPending}
                    onPress={onWithdraw}
                    style={[
                      styles.withdrawLink,
                      withdrawArmed && {
                        backgroundColor: theme.dangerSoft,
                        borderRadius: 10,
                      },
                    ]}>
                    {withdraw.isPending ? (
                      <ActivityIndicator color={theme.danger} />
                    ) : (
                      <Text style={[styles.withdrawLabel, { color: theme.danger }]}>
                        {withdrawArmed
                          ? 'Toque de novo para confirmar a desistência'
                          : 'Desistir da candidatura'}
                      </Text>
                    )}
                  </Pressable>
                )}
              </>
            ) : myCandidacy.data === 'refused' ? (
              <Text style={[styles.feedback, { color: theme.danger }]}>
                {CANDIDACY_MESSAGES.refused}
              </Text>
            ) : (
              <>
                {myPriority.data && (
                  <View style={[styles.priorityNote, { backgroundColor: theme.primarySoft }]}>
                    <Text style={[styles.priorityNoteText, { color: theme.primarySoftText }]}>
                      ⚡ Você tem destaque nesta vaga: um serviço seu neste mesmo horário foi
                      cancelado. Sua candidatura aparece no topo da lista.
                    </Text>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={apply.isPending}
                  onPress={onApply}
                  style={[
                    styles.accept,
                    { backgroundColor: theme.primary, opacity: apply.isPending ? 0.7 : 1 },
                  ]}>
                  {apply.isPending ? (
                    <ActivityIndicator color={theme.onPrimary} />
                  ) : (
                    <Text style={[styles.acceptLabel, { color: theme.onPrimary }]}>
                      Me candidatar · {formatBRL(gig.data.priceCents)}
                    </Text>
                  )}
                </Pressable>
                <Text style={[styles.note, { color: theme.textSecondary }]}>
                  O anunciante compara os candidatos e escolhe um. Candidatar-se não ocupa
                  a sua agenda — só a escolha ocupa.
                </Text>
              </>
            )}
          </ScrollView>
        )}
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  loading: {
    marginTop: Spacing.five,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  category: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
  },
  infoBox: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoLine: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoLink: {
    textDecorationLine: 'underline',
  },
  infoNote: {
    fontSize: 12,
    lineHeight: 16,
  },
  posterLink: {
    textDecorationLine: 'underline',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  feedback: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  accept: {
    borderRadius: Radius.large - 2,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  acceptLabel: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  withdrawLink: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  withdrawLabel: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  priorityNote: {
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
  },
  priorityNoteText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
});
