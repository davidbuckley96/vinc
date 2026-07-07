import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatBRL } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useServiceDetail } from '@/features/services/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useGigPayment } from '../hooks';

const STEPS = [
  { bold: 'Copie o código Pix', rest: 'toque no botão roxo abaixo' },
  { bold: 'Abra o app do seu banco', rest: 'e escolha Pix → copia e cola' },
  { bold: 'Cole e pague', rest: 'sua vaga publica sozinha na hora' },
];

/**
 * Pix payment screen — round 13, option B (D-035): guided copia-e-cola
 * in 3 numbered steps (the path that actually works on the phone); the
 * QR hides behind a link. Polls until the webhook publishes the gig,
 * then flips green and returns to the service.
 */
export function PayGigScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const service = useServiceDetail(gigId);
  const payment = useGigPayment(gigId);

  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // The webhook flips gig_payments to confirmed together with publishing
  // the gig, so polling the payment row is the single source here.
  const confirmed = payment.data?.status === 'confirmed';

  useEffect(() => {
    if (!confirmed) return;
    const timer = setTimeout(() => router.replace(`/service/${gigId}`), 1600);
    return () => clearTimeout(timer);
  }, [confirmed, gigId, router]);

  const copy = async () => {
    if (!payment.data?.qrCode) return;
    await Clipboard.setStringAsync(payment.data.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
              <View>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  Pagar e publicar
                </Text>
                {service.data && payment.data && (
                  <Text
                    style={[styles.headerSubtitle, { color: theme.onPrimaryMuted }]}
                    numberOfLines={1}>
                    {service.data.title} · {formatBRL(payment.data.totalCents)}
                  </Text>
                )}
              </View>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {payment.isLoading && <ActivityIndicator color={theme.primary} />}
          {payment.isSuccess && !payment.data && (
            <Text style={[styles.note, { color: theme.textSecondary }]}>
              Esta vaga não tem pagamento pendente.
            </Text>
          )}

          {payment.data && (
            <>
              <View style={styles.steps}>
                {STEPS.map((step, index) => (
                  <View key={step.bold} style={[styles.step, { borderColor: theme.line }]}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.stepNumberLabel, { color: theme.primarySoftText }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepBold, { color: theme.text }]}>
                        {index === 2
                          ? `Cole e pague ${formatBRL(payment.data!.totalCents)}`
                          : step.bold}
                      </Text>
                      <Text style={[styles.stepRest, { color: theme.textSecondary }]}>
                        {step.rest}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={copy}
                style={[
                  styles.copy,
                  { backgroundColor: copied ? theme.success : theme.primary },
                ]}>
                <Text style={[styles.copyLabel, { color: theme.onPrimary }]}>
                  {copied ? '✓ Código copiado!' : 'Copiar código Pix'}
                </Text>
              </Pressable>

              {confirmed ? (
                <View style={[styles.status, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                  <Text style={[styles.statusLabel, { color: theme.success }]}>
                    Pagamento confirmado — publicando sua vaga…
                  </Text>
                </View>
              ) : payment.data.status === 'expired' ? (
                <View style={[styles.status, { backgroundColor: theme.dangerSoft }]}>
                  <Text style={[styles.statusLabel, { color: theme.danger }]}>
                    O prazo de pagamento passou e o anúncio foi descartado sem custo.
                  </Text>
                </View>
              ) : (
                <View style={[styles.status, { backgroundColor: '#FFFBEB' }]}>
                  <ActivityIndicator size="small" color={theme.warning} />
                  <Text style={[styles.statusLabel, { color: theme.warning }]}>
                    Aguardando o pagamento…
                  </Text>
                </View>
              )}

              {!confirmed && payment.data.status === 'pending' && (
                <>
                  <Pressable accessibilityRole="button" onPress={() => setQrOpen((open) => !open)}>
                    <Text style={[styles.qrLink, { color: theme.primary }]}>
                      {qrOpen ? 'Esconder QR code' : 'Prefere escanear? Mostrar QR code'}
                    </Text>
                  </Pressable>
                  {qrOpen &&
                    (payment.data.qrCodeBase64 ? (
                      <Image
                        source={{ uri: `data:image/png;base64,${payment.data.qrCodeBase64}` }}
                        style={[styles.qr, { borderColor: theme.line }]}
                      />
                    ) : (
                      <Text style={[styles.qrFallback, { color: theme.textSecondary }]}>
                        {payment.data.qrCode}
                      </Text>
                    ))}
                  <Text style={[styles.note, { color: theme.textSecondary }]}>
                    Sem pagamento em 1 hora, o anúncio é descartado sem custo.
                  </Text>
                </>
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
    gap: Spacing.one + 2,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberLabel: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  stepBold: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  stepRest: {
    fontSize: 12.5,
    marginTop: 1,
  },
  copy: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  copyLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
  },
  statusLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  qrLink: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  qr: {
    width: 180,
    height: 180,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.medium,
  },
  qrFallback: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
});
