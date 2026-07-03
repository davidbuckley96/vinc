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

import type { ServiceDetail } from '@vinc/api';
import {
  allowedLifecycleAction,
  formatBRL,
  type GigStatus,
} from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useHasReviewed } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useLifecycleAction, useRespondCandidacy, useServiceDetail } from '../hooks';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

interface StatusCard {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  /** Label of the single available action button, when the role has one. */
  actionLabel?: string;
}

/** One big status card + at most one button — design "uma ação por vez" (D-008). */
function statusCard(service: ServiceDetail): StatusCard {
  const price = formatBRL(service.priceCents);
  const other = service.counterpartName ?? 'A outra pessoa';
  const worker = service.role === 'worker';

  switch (service.status) {
    case 'pending_approval':
      return worker
        ? {
            icon: 'hourglass',
            title: 'Candidatura enviada',
            body: `${other} vai aceitar ou recusar em breve. A vaga está reservada para você enquanto isso.`,
          }
        : {
            icon: 'person-add',
            title: `${other} quer fazer o serviço`,
            body: 'Aceite ou recuse. Enquanto você decide, ninguém mais pode se candidatar. Recusar não gera multa.',
          };
    case 'accepted':
      return worker
        ? {
            icon: 'checkmark-circle',
            title: 'Serviço aceito!',
            body: 'Quando chegar no local, toque em iniciar.',
            actionLabel: 'Iniciar serviço',
          }
        : {
            icon: 'person-circle',
            title: `${other} vai fazer o serviço`,
            body: 'Você será avisado quando o serviço começar.',
          };
    case 'in_progress':
      return worker
        ? {
            icon: 'time',
            title: 'Serviço em andamento',
            body: 'Ao terminar o trabalho, toque em concluir.',
            actionLabel: 'Concluí o serviço',
          }
        : {
            icon: 'time',
            title: 'Serviço em andamento',
            body: `${other} está realizando o serviço.`,
          };
    case 'awaiting_confirmation':
      return worker
        ? {
            icon: 'hourglass',
            title: 'Aguardando confirmação',
            body: `${other} confirma a conclusão e ${price} cai na sua carteira.`,
          }
        : {
            icon: 'help-circle',
            title: 'Confirme a conclusão',
            body: `O serviço foi realizado corretamente? Ao confirmar, ${price} é liberado para ${other}.`,
            actionLabel: 'Confirmar conclusão',
          };
    case 'completed':
      return worker
        ? {
            icon: 'trophy',
            title: 'Serviço concluído! 🎉',
            body: `${price} entrou na sua carteira. Não esqueça de avaliar.`,
          }
        : {
            icon: 'trophy',
            title: 'Serviço concluído',
            body: `${price} foi pago a ${other}. Não esqueça de avaliar.`,
          };
    default:
      return {
        icon: 'close-circle',
        title: 'Serviço encerrado',
        body: 'Este serviço foi cancelado ou expirou.',
      };
  }
}

const RESULT_MESSAGES: Record<string, string> = {
  state_changed: 'O status mudou agora mesmo. Atualize e tente de novo.',
  invalid_action: 'Essa ação não está mais disponível.',
  forbidden: 'Você não participa deste serviço.',
  unauthorized: 'Entre na sua conta para continuar.',
  not_found: 'Este serviço não existe mais.',
  invalid_request: 'Algo deu errado. Tente de novo.',
  network_error: 'Sem conexão. Verifique sua internet e tente de novo.',
};

export function ServiceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = useServiceDetail(id);
  const lifecycle = useLifecycleAction(id);
  const candidacy = useRespondCandidacy(id);
  const reviewed = useHasReviewed(id);
  const [error, setError] = useState<string | null>(null);
  const [candidacyNote, setCandidacyNote] = useState<string | null>(null);

  const decide = async (action: 'approve' | 'refuse') => {
    setError(null);
    setCandidacyNote(null);
    const result = await candidacy.mutateAsync(action);
    if (result === 'approved') {
      setCandidacyNote('Candidato aceito! O valor foi reservado e o serviço está confirmado.');
    } else if (result === 'refused') {
      setCandidacyNote('Candidatura recusada. A vaga voltou a ficar aberta para outras pessoas.');
    } else if (result === 'candidate_unavailable') {
      setCandidacyNote('Este candidato ficou ocupado nesse horário. A vaga voltou a ficar aberta.');
    } else {
      setError('Não foi possível responder agora. Tente de novo.');
    }
  };

  const act = async () => {
    if (!service.data) return;
    setError(null);
    const action = allowedLifecycleAction(
      service.data.status as GigStatus,
      service.data.role,
    );
    if (!action) return;
    const result = await lifecycle.mutateAsync(action);
    if (result !== 'done') {
      setError(RESULT_MESSAGES[result] ?? RESULT_MESSAGES.invalid_request!);
    }
  };

  const data = service.data;
  const start = data ? new Date(data.startsAt) : null;
  const end = data ? new Date(data.endsAt) : null;
  const card = data ? statusCard(data) : null;

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
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                {data?.title ?? 'Serviço'}
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>

        {service.isLoading && <ActivityIndicator color={theme.primary} style={styles.loading} />}
        {(service.isError || (service.isSuccess && !data)) && (
          <Text style={[styles.error, { color: theme.danger }]}>
            Não foi possível carregar este serviço.
          </Text>
        )}

        {data && card && start && end && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <View style={[styles.statusCard, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={card.icon} size={36} color={theme.primarySoftText} />
              <Text style={[styles.statusTitle, { color: theme.primarySoftText }]}>
                {card.title}
              </Text>
              <Text style={[styles.statusBody, { color: theme.primarySoftMeta }]}>
                {card.body}
              </Text>
            </View>

            <View style={[styles.kv, { borderBottomColor: theme.line }]}>
              <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>Quando</Text>
              <Text style={[styles.kvValue, { color: theme.text }]}>
                {WEEKDAYS[start.getDay()]}, {start.getDate()} · {start.getHours()}h às{' '}
                {end.getHours()}h
              </Text>
            </View>
            <View style={[styles.kv, { borderBottomColor: theme.line }]}>
              <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>Valor</Text>
              <Text style={[styles.kvValue, { color: theme.primary }]}>
                {formatBRL(data.priceCents)}
              </Text>
            </View>
            {data.counterpartName && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver perfil de ${data.counterpartName}`}
                disabled={!data.counterpartId}
                onPress={() =>
                  router.push(
                    `/user/${data.counterpartId}?role=${data.role === 'poster' ? 'worker' : 'poster'}&name=${encodeURIComponent(data.counterpartName!)}`,
                  )
                }
                style={[styles.kv, { borderBottomColor: theme.line }]}>
                <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>Com</Text>
                <Text style={[styles.kvValue, styles.kvLink, { color: theme.primary }]}>
                  {data.counterpartName} ›
                </Text>
              </Pressable>
            )}
            <View style={[styles.kv, { borderBottomColor: theme.line }]}>
              <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>Onde</Text>
              <Text style={[styles.kvValue, { color: theme.text }]}>{data.address}</Text>
            </View>
            {data.description ? (
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {data.description}
              </Text>
            ) : null}

            {candidacyNote && (
              <Text style={[styles.error, { color: theme.success }]}>{candidacyNote}</Text>
            )}
            {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

            {data.status === 'pending_approval' && data.role === 'poster' && !candidacyNote && (
              <View style={styles.decideRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={candidacy.isPending}
                  onPress={() => decide('approve')}
                  style={[
                    styles.action,
                    styles.decideButton,
                    { backgroundColor: theme.primary, opacity: candidacy.isPending ? 0.7 : 1 },
                  ]}>
                  {candidacy.isPending ? (
                    <ActivityIndicator color={theme.onPrimary} />
                  ) : (
                    <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                      Aceitar candidato
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={candidacy.isPending}
                  onPress={() => decide('refuse')}
                  style={[
                    styles.action,
                    styles.decideButton,
                    styles.refuseButton,
                    { borderColor: theme.danger, backgroundColor: theme.background },
                  ]}>
                  <Text style={[styles.actionLabel, { color: theme.danger }]}>Recusar</Text>
                </Pressable>
              </View>
            )}

            {card.actionLabel && (
              <Pressable
                accessibilityRole="button"
                disabled={lifecycle.isPending}
                onPress={act}
                style={[
                  styles.action,
                  { backgroundColor: theme.primary, opacity: lifecycle.isPending ? 0.7 : 1 },
                ]}>
                {lifecycle.isPending ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                    {card.actionLabel}
                  </Text>
                )}
              </Pressable>
            )}
            {data.status === 'completed' && reviewed.isSuccess && !reviewed.data && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/review/${data.id}`)}
                style={[styles.action, { backgroundColor: theme.primary }]}>
                <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                  ⭐ Avaliar {data.counterpartName ?? 'a outra pessoa'}
                </Text>
              </Pressable>
            )}
            {data.status === 'completed' && data.role === 'worker' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/wallet')}
                style={[styles.action, { backgroundColor: theme.success }]}>
                <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                  Ver na carteira
                </Text>
              </Pressable>
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
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
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
  statusCard: {
    borderRadius: Radius.large,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusBody: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.three,
  },
  kvLabel: {
    fontSize: 13,
  },
  kvValue: {
    fontSize: 13.5,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  kvLink: {
    textDecorationLine: 'underline',
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    paddingTop: Spacing.one,
  },
  error: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    padding: Spacing.two,
  },
  decideRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  decideButton: {
    flex: 1,
    marginTop: Spacing.two,
  },
  refuseButton: {
    borderWidth: 1.5,
  },
  action: {
    borderRadius: Radius.large - 2,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  actionLabel: {
    fontSize: 15.5,
    fontWeight: '800',
  },
});
