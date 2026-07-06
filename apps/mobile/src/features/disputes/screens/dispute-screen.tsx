import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { OpenDisputeResult } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useServiceDetail } from '@/features/services/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useOpenDispute, type DisputePhoto } from '../hooks';

const REASON_MIN = 20;
const REASON_MAX = 2000;
const MAX_PHOTOS = 5;

/** Chips that start the report for whoever struggles to write (round 10, B). */
const PROBLEM_CHIPS = [
  'Serviço incompleto',
  'Não compareceu',
  'Ficou malfeito',
  'Causou dano',
  'Outro',
];

const RESULT_MESSAGES: Record<Exclude<OpenDisputeResult, 'opened'>, string> = {
  already_disputed: 'Este serviço já tem uma contestação aberta ou resolvida.',
  not_disputable: 'Este serviço não pode ser contestado.',
  window_closed: 'O prazo de 7 dias para pedir reembolso já passou.',
  invalid_reason: `Conte o que aconteceu com pelo menos ${REASON_MIN} caracteres.`,
  unauthorized: 'Entre na sua conta para continuar.',
  not_found: 'Este serviço não existe mais.',
  forbidden: 'Só quem anunciou o serviço pode contestar.',
  state_changed: 'O status mudou agora mesmo. Atualize e tente de novo.',
  invalid_request: 'Algo deu errado. Tente de novo.',
  network_error: 'Sem conexão. Verifique sua internet e tente de novo.',
};

/**
 * Dispute / refund-request form — round 10, option B (D-028/D-031):
 * step 1 picks the problem type (chips prefill the report) + free text;
 * step 2 adds photos and reviews what happens before sending.
 */
export function DisputeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const service = useServiceDetail(gigId);
  const open = useOpenDispute(gigId);

  const [step, setStep] = useState<1 | 2>(1);
  const [chip, setChip] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<DisputePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isRefund = service.data?.status === 'completed';
  const title = isRefund ? 'Pedir reembolso' : 'Contestar conclusão';
  const price = service.data ? formatBRL(service.data.priceCents) : '';

  const pickChip = (label: string) => {
    setChip(label);
    // Start the report for the person unless they already wrote their own.
    const prefixes = PROBLEM_CHIPS.map((item) => `${item}: `);
    if (!reason.trim() || prefixes.some((prefix) => reason === prefix)) {
      setReason(label === 'Outro' ? '' : `${label}: `);
    }
  };

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPhotos((current) =>
      [...current, ...result.assets.map((asset) => ({ uri: asset.uri }))].slice(0, MAX_PHOTOS),
    );
  };

  const submit = async () => {
    setError(null);
    const result = await open.mutateAsync({ reason: reason.trim(), photos });
    if (result === 'opened') {
      router.replace(`/service/${gigId}`);
    } else {
      setError(RESULT_MESSAGES[result]);
    }
  };

  const reasonReady = reason.trim().length >= REASON_MIN;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => (step === 2 ? setStep(1) : router.back())}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <View>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>{title}</Text>
                <Text style={[styles.headerSubtitle, { color: theme.onPrimaryMuted }]}>
                  {step === 1
                    ? 'Passo 1 de 2 — o que aconteceu?'
                    : 'Passo 2 de 2 — fotos e envio'}
                </Text>
              </View>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.steps}>
            <View style={[styles.stepDot, { backgroundColor: theme.primary }]} />
            <View
              style={[
                styles.stepDot,
                { backgroundColor: step === 2 ? theme.primary : theme.line },
              ]}
            />
          </View>

          {step === 1 ? (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                QUAL FOI O PROBLEMA?
              </Text>
              <View style={styles.chips}>
                {PROBLEM_CHIPS.map((label) => {
                  const selected = chip === label;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      onPress={() => pickChip(label)}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? theme.danger : theme.line,
                          backgroundColor: selected ? theme.dangerSoft : theme.background,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: selected ? theme.danger : theme.textSecondary },
                        ]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                CONTE COM SUAS PALAVRAS
              </Text>
              <TextInput
                style={[
                  styles.textarea,
                  { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
                ]}
                multiline
                maxLength={REASON_MAX}
                placeholder="Conte o que deu errado, com detalhes…"
                placeholderTextColor={theme.textSecondary}
                value={reason}
                onChangeText={setReason}
              />
              <Text style={[styles.count, { color: theme.textSecondary }]}>
                {reason.trim().length}/{REASON_MAX}
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={!reasonReady}
                onPress={() => setStep(2)}
                style={[
                  styles.cta,
                  { backgroundColor: reasonReady ? theme.primary : theme.backgroundSelected },
                ]}>
                <Text
                  style={[
                    styles.ctaLabel,
                    { color: reasonReady ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Continuar
                </Text>
              </Pressable>
              <Text style={[styles.note, { color: theme.textSecondary }]}>
                {reasonReady
                  ? 'No próximo passo: fotos (opcional) e revisão antes de enviar.'
                  : `Escreva pelo menos ${REASON_MIN} caracteres para continuar.`}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                FOTOS (OPCIONAL, ATÉ {MAX_PHOTOS})
              </Text>
              <View style={styles.photos}>
                {photos.map((photo, index) => (
                  <View key={photo.uri} style={styles.thumbWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.thumb} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover foto ${index + 1}`}
                      onPress={() =>
                        setPhotos((current) => current.filter((item) => item !== photo))
                      }
                      style={styles.thumbRemove}>
                      <Ionicons name="close" size={11} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar fotos"
                    onPress={addPhotos}
                    style={[
                      styles.addPhoto,
                      { borderColor: theme.primary, backgroundColor: theme.primarySoft },
                    ]}>
                    <Ionicons name="add" size={22} color={theme.primary} />
                  </Pressable>
                )}
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>SEU RELATO</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar o relato"
                onPress={() => setStep(1)}
                style={[styles.review, { borderColor: theme.line }]}>
                <Text style={[styles.reviewText, { color: theme.text }]} numberOfLines={4}>
                  {reason.trim()}
                </Text>
                <Text style={[styles.reviewEdit, { color: theme.primary }]}>Editar ›</Text>
              </Pressable>

              <View style={[styles.how, { borderColor: theme.line }]}>
                {[
                  isRefund
                    ? `O pagamento de ${price} fica congelado na carteira do prestador.`
                    : `O pagamento de ${price} fica congelado — não vai para o prestador ainda.`,
                  'A plataforma analisa seu relato, as fotos, a conversa e o check-in.',
                  'Você recebe a decisão: reembolso total, parcial ou liberação.',
                ].map((text, index) => (
                  <View key={text} style={styles.howRow}>
                    <View style={[styles.howNumber, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.howNumberLabel, { color: theme.primarySoftText }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.howText, { color: theme.textSecondary }]}>{text}</Text>
                  </View>
                ))}
              </View>

              {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

              <Pressable
                accessibilityRole="button"
                disabled={open.isPending}
                onPress={submit}
                style={[styles.cta, { backgroundColor: theme.danger, opacity: open.isPending ? 0.7 : 1 }]}>
                {open.isPending ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <Text style={[styles.ctaLabel, { color: theme.onPrimary }]}>
                    {isRefund ? 'Enviar pedido de reembolso' : 'Enviar contestação'}
                  </Text>
                )}
              </Pressable>
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
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  steps: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  stepDot: {
    width: 22,
    height: 4,
    borderRadius: Radius.pill,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  textarea: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  count: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: -4,
  },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  photos: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    flexWrap: 'wrap',
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium - 2,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1c1f24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium - 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  review: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    gap: 4,
  },
  reviewText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  reviewEdit: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  how: {
    borderWidth: 1.5,
    borderRadius: Radius.large,
    padding: Spacing.two + 3,
    gap: Spacing.two,
  },
  howRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    alignItems: 'flex-start',
  },
  howNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  howNumberLabel: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  howText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  error: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
});
