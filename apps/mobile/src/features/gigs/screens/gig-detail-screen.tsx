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

import type { AcceptGigResult } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { useAcceptGig, useCategories, useGig } from '../hooks';

const RESULT_MESSAGES: Record<Exclude<AcceptGigResult, 'accepted'>, string> = {
  unauthorized: 'Entre na sua conta para aceitar serviços.',
  not_found: 'Esta vaga não existe mais.',
  own_gig: 'Esta vaga foi anunciada por você.',
  already_taken: 'Alguém aceitou esta vaga antes de você.',
  schedule_conflict: 'Você já tem um compromisso nesse horário.',
  invalid_request: 'Algo deu errado. Tente de novo.',
  network_error: 'Sem conexão. Verifique sua internet e tente de novo.',
};

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Gig detail with the one-tap accept action (docs/02 §3: no selection process). */
export function GigDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status } = useSession();
  const gig = useGig(id);
  const categories = useCategories();
  const accept = useAcceptGig();
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );
  const [accepted, setAccepted] = useState(false);

  const onAccept = async () => {
    setFeedback(null);
    if (status === 'signedOut') {
      router.push('/auth');
      return;
    }
    const result = await accept.mutateAsync(id);
    if (result === 'accepted') {
      setAccepted(true);
      setFeedback({
        kind: 'success',
        text:
          status === 'unconfigured'
            ? 'Modo demonstração: o serviço seria aceito agora.'
            : 'Serviço aceito! Ele já está na sua agenda.',
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
              <Text style={[styles.infoLine, { color: theme.primarySoftText }]}>
                📍 {gig.data.address}
              </Text>
              <Text style={[styles.infoLine, { color: theme.primarySoftText }]}>
                👤 Anunciado por {gig.data.posterName}
              </Text>
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

            {accepted ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/')}
                style={[styles.accept, { backgroundColor: theme.success }]}>
                <Text style={[styles.acceptLabel, { color: theme.onPrimary }]}>
                  Ver na minha agenda
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={accept.isPending}
                onPress={onAccept}
                style={[
                  styles.accept,
                  { backgroundColor: theme.primary, opacity: accept.isPending ? 0.7 : 1 },
                ]}>
                {accept.isPending ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <Text style={[styles.acceptLabel, { color: theme.onPrimary }]}>
                    Aceitar serviço · {formatBRL(gig.data.priceCents)}
                  </Text>
                )}
              </Pressable>
            )}
            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Ao aceitar, o serviço entra na sua agenda e o anunciante é avisado. Cancelar
              depois prejudica sua reputação.
            </Text>
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
  note: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
});
