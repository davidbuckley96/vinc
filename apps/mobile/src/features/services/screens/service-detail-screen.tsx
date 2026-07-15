import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ServiceDetail } from '@vinc/api';
import {
  allowedLifecycleAction,
  computeCancellationFine,
  computeGigPricing,
  formatBRL,
  posterCanEdit,
  posterCancellationIncursFine,
  type GigStatus,
} from '@vinc/core';

import { LocationModal } from '@/components/location-map';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useDispute } from '@/features/disputes/hooks';
import { CandidateList } from '@/features/gigs/components/candidate-list';
import { useCancelGig, useDeleteGig } from '@/features/gigs/hooks';
import { useUnreadCount } from '@/features/messages/hooks';
import { useHasReviewed } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useLifecycleAction, useServiceDetail } from '../hooks';

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
    case 'pending_payment':
      return {
        icon: 'qr-code',
        title: 'Aguardando pagamento',
        body: `Pague ${formatBRL(computeGigPricing(service.priceCents).totalCents)} via Pix para confirmar o candidato escolhido. Sem pagamento em 30 minutos, a escolha é desfeita e a vaga continua aberta — sem custo.`,
      };
    case 'open':
      return {
        icon: 'megaphone',
        title: 'Vaga publicada',
        body: 'Sua vaga está visível para os trabalhadores. Os candidatos aparecem aqui para você escolher.',
      };
    case 'accepted':
      return worker
        ? {
            icon: 'checkmark-circle',
            title: 'Serviço aceito!',
            body: 'Quando chegar no local, peça o código de 4 dígitos ao anunciante e toque em iniciar.',
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
            body: 'Ao terminar o trabalho, toque em concluir. Você poderá anexar fotos de como ficou — elas te protegem.',
            actionLabel: 'Concluí o serviço',
          }
        : {
            icon: 'time',
            title: 'Serviço em andamento',
            body: `${other} está realizando o serviço. Quando terminar e estiver tudo certo, você pode confirmar a conclusão por aqui — mesmo que ${other} fique sem celular ou internet.`,
            actionLabel: 'Confirmar conclusão',
          };
    case 'awaiting_confirmation':
      return worker
        ? {
            icon: 'hourglass',
            title: 'Aguardando confirmação',
            body: `${other} confirma a conclusão e ${price} cai na sua carteira. Sem resposta, libera sozinho em 48h.`,
          }
        : {
            icon: 'help-circle',
            title: 'Confirme a conclusão',
            body: `O serviço foi realizado corretamente? Ao confirmar, ${price} é liberado para ${other}. Sem resposta nem contestação, libera sozinho em 48h.`,
            actionLabel: 'Confirmar conclusão',
          };
    case 'disputed':
      return worker
        ? {
            icon: 'shield-half',
            title: 'Serviço em análise',
            body: `${other} contestou a conclusão. O pagamento de ${price} fica congelado enquanto a plataforma analisa o caso. Você será avisado da decisão.`,
          }
        : {
            icon: 'shield-half',
            title: 'Contestação em análise',
            body: 'Recebemos o seu relato. O pagamento está congelado enquanto a plataforma analisa o caso. Você será avisado da decisão.',
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
  wrong_code: 'Código errado. Peça ao anunciante o código de 4 dígitos que aparece na tela dele.',
  too_early: 'Ainda é cedo. O serviço só pode começar a partir de 30 minutos antes do horário combinado.',
  too_soon: 'O serviço precisa durar pelo menos 30 minutos antes de ser finalizado. Se houve um problema, fale com o suporte.',
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
  const reviewed = useHasReviewed(id);
  const deletion = useDeleteGig();
  const cancellation = useCancelGig();
  const dispute = useDispute(id);
  // Sending ends with the service (D-026); on completed the button only
  // opens the history.
  const chatActive =
    service.data != null &&
    service.data.counterpartId != null &&
    ['accepted', 'in_progress', 'awaiting_confirmation'].includes(service.data.status);
  const chatReady = chatActive || (service.data?.status === 'completed' && service.data.counterpartId != null);
  const unread = useUnreadCount(id, chatActive);
  const [error, setError] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deletedNote, setDeletedNote] = useState<string | null>(null);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [cancelledNote, setCancelledNote] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  // Check-in by code (D-028): tapping "Iniciar serviço" reveals the input.
  const [startArmed, setStartArmed] = useState(false);
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [startCode, setStartCode] = useState('');

  const cancelWithFine = async () => {
    if (!service.data) return;
    if (!cancelArmed) {
      setCancelArmed(true);
      return;
    }
    setError(null);
    const result = await cancellation.mutateAsync(service.data.id);
    setCancelArmed(false);
    if (result === 'cancelled') {
      const fine = computeCancellationFine(service.data.priceCents);
      setCancelledNote(
        service.data.role === 'worker'
          ? `Serviço cancelado. A multa de ${formatBRL(fine.fineCents)} foi cobrada da sua carteira como compensação pelo anunciante.`
          : fine.posterRefundCents > 0
            ? `Serviço cancelado. ${formatBRL(fine.posterRefundCents)} voltaram para a sua carteira (${formatBRL(service.data.priceCents)} do serviço menos a multa de ${formatBRL(fine.fineCents)}, compensação pelo prestador lesado).`
            : `Serviço cancelado. A multa de ${formatBRL(fine.fineCents)} consumiu o valor do serviço (compensação pelo prestador lesado).`,
      );
      setTimeout(() => router.back(), 1800);
    } else if (result === 'not_cancellable' || result === 'state_changed') {
      setError('Este serviço não pode mais ser cancelado — atualize e tente de novo.');
    } else {
      setError('Não foi possível cancelar agora. Tente de novo.');
    }
  };

  const removeGig = async () => {
    if (!service.data) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setError(null);
    const result = await deletion.mutateAsync(service.data.id);
    setDeleteArmed(false);
    if (result === 'deleted') {
      setDeletedNote(
        `Vaga excluída. ${formatBRL(service.data.priceCents)} voltaram para a sua carteira (a taxa de serviço não é reembolsável).`,
      );
      setTimeout(() => router.back(), 1600);
    } else if (result === 'not_deletable' || result === 'state_changed') {
      setError('Esta vaga não pode mais ser excluída — atualize e tente de novo.');
    } else {
      setError('Não foi possível excluir agora. Tente de novo.');
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
    // Completing has its own screen (D-032): optional photos + report.
    if (action === 'complete') {
      router.push(`/complete/${service.data.id}`);
      return;
    }
    // Confirming while still "in progress" (D-032 layer 2) releases the
    // payment early — ask twice.
    if (action === 'confirm' && service.data.status === 'in_progress' && !confirmArmed) {
      setConfirmArmed(true);
      return;
    }
    if (action === 'start' && !startArmed) {
      setStartArmed(true);
      return;
    }
    if (action === 'start' && startCode.trim().length < 4) {
      setError('Digite o código de 4 dígitos que o anunciante te mostrar.');
      return;
    }
    const result = await lifecycle.mutateAsync({ action, code: startCode.trim() || undefined });
    if (result === 'done') {
      setStartArmed(false);
      setConfirmArmed(false);
      setStartCode('');
    } else {
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

            {chatReady && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/chat/${data.id}`)}
                style={[styles.chat, { borderColor: theme.primary }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={theme.primary} />
                <Text style={[styles.chatLabel, { color: theme.primary }]}>
                  {data.status === 'completed'
                    ? 'Ver conversa'
                    : `Conversar com ${data.counterpartName ?? 'a outra pessoa'}`}
                </Text>
                {(unread.data ?? 0) > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                    <Text style={[styles.badgeLabel, { color: theme.onPrimary }]}>
                      {unread.data}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}

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
            {/* Exact address when RLS allows (poster / chosen worker);
                otherwise the approximate area (D-028). */}
            {(() => {
              const exact = data.address !== null;
              const label = exact ? data.address! : data.area;
              const pinLat = exact ? data.lat : data.approxLat;
              const pinLng = exact ? data.lng : data.approxLng;
              if (pinLat === null || pinLng === null) {
                return (
                  <View style={[styles.kv, { borderBottomColor: theme.line }]}>
                    <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>Onde</Text>
                    <Text style={[styles.kvValue, { color: theme.text }]}>{label}</Text>
                  </View>
                );
              }
              return (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={exact ? 'Ver o local no mapa' : 'Ver a região no mapa'}
                    onPress={() => setMapOpen(true)}
                    style={[styles.kv, { borderBottomColor: theme.line }]}>
                    <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>Onde</Text>
                    <Text style={[styles.kvValue, styles.kvLink, { color: theme.primary }]}>
                      {label} ›
                    </Text>
                  </Pressable>
                  <LocationModal
                    visible={mapOpen}
                    lat={pinLat}
                    lng={pinLng}
                    address={label}
                    approximate={!exact}
                    onClose={() => setMapOpen(false)}
                  />
                </>
              );
            })()}
            {data.description ? (
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {data.description}
              </Text>
            ) : null}

            {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

            {deletedNote && (
              <Text style={[styles.error, { color: theme.success }]}>{deletedNote}</Text>
            )}
            {data.role === 'poster' &&
              posterCanEdit(data.status as GigStatus) &&
              !deletedNote && (
                <View style={styles.decideRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/gig/edit/${data.id}`)}
                    style={[
                      styles.action,
                      styles.decideButton,
                      styles.refuseButton,
                      { borderColor: theme.primary, backgroundColor: theme.background },
                    ]}>
                    <Text style={[styles.actionLabel, { color: theme.primary }]}>
                      Editar vaga
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={deletion.isPending}
                    onPress={removeGig}
                    style={[
                      styles.action,
                      styles.decideButton,
                      styles.refuseButton,
                      {
                        borderColor: theme.danger,
                        backgroundColor: deleteArmed ? theme.danger : theme.background,
                      },
                    ]}>
                    {deletion.isPending ? (
                      <ActivityIndicator color={theme.danger} />
                    ) : (
                      <Text
                        style={[
                          styles.actionLabel,
                          { color: deleteArmed ? theme.onPrimary : theme.danger },
                        ]}>
                        {deleteArmed ? 'Confirmar exclusão' : 'Excluir vaga'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

            {cancelledNote && (
              <Text style={[styles.error, { color: theme.success }]}>{cancelledNote}</Text>
            )}
            {posterCancellationIncursFine(data.status as GigStatus) &&
              !cancelledNote && (
                <View style={styles.cancelBlock}>
                  {cancelArmed && (
                    <Text style={[styles.fineWarning, { color: theme.danger }]}>
                      {data.role === 'poster'
                        ? `Cancelar agora tem multa de ${formatBRL(computeCancellationFine(data.priceCents).fineCents)} (25%, mínimo R$ 10), como compensação pelo prestador lesado. Você recebe de volta ${formatBRL(computeCancellationFine(data.priceCents).posterRefundCents)} dos ${formatBRL(data.priceCents)} do serviço.`
                        : `Cancelar agora tem multa de ${formatBRL(computeCancellationFine(data.priceCents).fineCents)} (25%, mínimo R$ 10), cobrada de você como compensação pelo anunciante.`}
                    </Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    disabled={cancellation.isPending}
                    onPress={cancelWithFine}
                    style={[
                      styles.action,
                      styles.refuseButton,
                      {
                        borderColor: theme.danger,
                        backgroundColor: cancelArmed ? theme.danger : theme.background,
                      },
                    ]}>
                    {cancellation.isPending ? (
                      <ActivityIndicator color={theme.danger} />
                    ) : (
                      <Text
                        style={[
                          styles.actionLabel,
                          { color: cancelArmed ? theme.onPrimary : theme.danger },
                        ]}>
                        {cancelArmed ? 'Confirmar cancelamento (com multa)' : 'Cancelar serviço'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

            {data.role === 'poster' && data.status === 'open' && !deletedNote && (
              <CandidateList gigId={data.id} enabled />
            )}

            {data.role === 'poster' && data.status === 'accepted' && data.checkinCode && (
              <View style={[styles.codeBox, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.codeLabel, { color: theme.primarySoftMeta }]}>
                  CÓDIGO DE INÍCIO
                </Text>
                <Text style={[styles.codeValue, { color: theme.primarySoftText }]}>
                  {data.checkinCode}
                </Text>
                <Text style={[styles.codeHint, { color: theme.primarySoftMeta }]}>
                  Mostre este código ao prestador quando ele chegar — é assim que o serviço
                  começa.
                </Text>
              </View>
            )}
            {/* F-04 (docs/14): antes da janela de 30 min o código nem vem do
                servidor (RLS). Explicamos por que a caixa ainda está vazia. */}
            {data.role === 'poster' && data.status === 'accepted' && !data.checkinCode && (
              <View style={[styles.codeBox, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.codeLabel, { color: theme.primarySoftMeta }]}>
                  CÓDIGO DE INÍCIO
                </Text>
                <Text style={[styles.codeHint, { color: theme.primarySoftMeta }]}>
                  O código aparece aqui 30 minutos antes do horário combinado — é assim que o
                  serviço começa.
                </Text>
              </View>
            )}

            {startArmed && data.role === 'worker' && data.status === 'accepted' && (
              <TextInput
                style={[
                  styles.codeInput,
                  { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
                ]}
                placeholder="Código de 4 dígitos"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={4}
                value={startCode}
                onChangeText={setStartCode}
              />
            )}

            {confirmArmed && data.status === 'in_progress' && (
              <Text style={[styles.error, { color: theme.danger }]}>
                Confirme só se o serviço já terminou e ficou tudo certo — {formatBRL(data.priceCents)}{' '}
                são liberados para {data.counterpartName ?? 'o prestador'} na hora.
              </Text>
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
                    {startArmed && card.actionLabel === 'Iniciar serviço'
                      ? 'Confirmar código e iniciar'
                      : confirmArmed && data.status === 'in_progress'
                        ? 'Confirmar conclusão agora'
                        : card.actionLabel}
                  </Text>
                )}
              </Pressable>
            )}
            {data.role === 'poster' && data.status === 'pending_payment' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/pay/${data.id}`)}
                style={[styles.action, { backgroundColor: theme.primary }]}>
                <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                  Pagar agora via Pix
                </Text>
              </Pressable>
            )}

            {/* Contest entry (docs/02 §6, round 10 option B): a discreet
                link that never competes with the primary action. */}
            {data.role === 'poster' &&
              ['awaiting_confirmation', 'completed'].includes(data.status) &&
              !dispute.data && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/dispute/${data.id}`)}
                  style={styles.disputeLink}>
                  <Text style={[styles.disputeLinkLabel, { color: theme.danger }]}>
                    Algo deu errado?{' '}
                    {data.status === 'completed' ? 'Pedir reembolso' : 'Contestar'}
                  </Text>
                </Pressable>
              )}

            {/* F-05 (docs/14): saída pro trabalhador que tem um problema durante
                o serviço (não consegue finalizar, imprevisto etc.) — abre o
                suporte, que pode finalizar antes da hora se preciso. */}
            {data.role === 'worker' && data.status === 'in_progress' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/help')}
                style={styles.disputeLink}>
                <Text style={[styles.disputeLinkLabel, { color: theme.textSecondary }]}>
                  Algum problema durante o serviço? Falar com o suporte
                </Text>
              </Pressable>
            )}
            {dispute.data && data.status === 'completed' && (
              <Text style={[styles.disputeState, { color: theme.textSecondary }]}>
                {dispute.data.status === 'open'
                  ? 'Contestação em análise pela plataforma. Você será avisado da decisão.'
                  : dispute.data.refundCents
                    ? `Contestação resolvida: reembolso de ${formatBRL(dispute.data.refundCents)} ao anunciante.`
                    : 'Contestação resolvida: o pagamento foi liberado integralmente.'}
              </Text>
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
  disputeLink: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  disputeLinkLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  disputeState: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
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
  cancelBlock: {
    marginTop: Spacing.two,
  },
  codeBox: {
    borderRadius: Radius.large - 2,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 2,
    marginTop: Spacing.two,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 10,
  },
  codeHint: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16.5,
  },
  codeInput: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  chat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    borderWidth: 1.5,
    borderRadius: Radius.large - 2,
    paddingVertical: 12,
    marginBottom: Spacing.two,
  },
  chatLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  fineWarning: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18.5,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
