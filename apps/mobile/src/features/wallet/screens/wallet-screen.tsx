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

import { Ionicons } from '@expo/vector-icons';

import { formatBRL, maskPixKey, PROCESSING_HOLD_DAYS } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { usePayoutAccount, useWallet, useWithdraw } from '../hooks';
import { entryLabel, receivedLabel, releaseLabel } from '../labels';

type Tab = 'available' | 'processing';

/**
 * Wallet — D-021 (round 6, option C): one big withdrawable balance,
 * "Disponível" / "Em processamento" tabs, full statement behind
 * "Ver histórico" and the withdraw action pinned at the bottom. Future
 * services never show up here (they live in the agenda).
 */
export function WalletScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status } = useSession();
  const wallet = useWallet();
  const withdrawal = useWithdraw();
  const payout = usePayoutAccount();

  const [tab, setTab] = useState<Tab>('available');
  const [withdrawArmed, setWithdrawArmed] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  const data = wallet.data;
  const canWithdraw = (data?.availableCents ?? 0) > 0 && status !== 'signedOut';
  // Round 14 (option A): the destination line only renders once the
  // account query settles, so "cadastre" never flashes for who has a key.
  const pixKeyLabel = payout.data
    ? maskPixKey(payout.data.pixKeyType, payout.data.pixKey)
    : null;
  const needsPixKey = status === 'signedIn' && payout.isSuccess && !payout.data;

  const doWithdraw = async () => {
    if (!data) return;
    if (!withdrawArmed) {
      setWithdrawArmed(true);
      return;
    }
    setFeedback(null);
    setWithdrawArmed(false);
    const amount = data.availableCents;
    const result = await withdrawal.mutateAsync();
    if (result === 'withdrawn') {
      setFeedback({
        kind: 'success',
        text:
          status === 'unconfigured'
            ? 'Modo demonstração: o saque seria feito agora.'
            : `Saque de ${formatBRL(amount)} realizado${
                pixKeyLabel ? ` — Pix a caminho de ${pixKeyLabel}` : ''
              } (simulado até os pagamentos de verdade).`,
      });
    } else if (result === 'nothing_to_withdraw') {
      setFeedback({ kind: 'error', text: 'Nada para sacar ainda.' });
    } else if (result === 'payout_account_missing') {
      // Receiver onboarding gate (3.3): register the Pix key first.
      router.push('/payout');
    } else {
      setFeedback({ kind: 'error', text: 'Não foi possível sacar agora. Tente de novo.' });
    }
  };

  const tabStyle = (active: boolean) => [
    styles.tab,
    active && { backgroundColor: theme.background, ...styles.tabActive },
  ];
  const tabLabelStyle = (active: boolean) => [
    styles.tabLabel,
    { color: active ? theme.primarySoftText : theme.textSecondary },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Carteira</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/wallet-history')}
                style={styles.historyPill}>
                <Text style={[styles.historyLabel, { color: theme.onPrimary }]}>
                  Ver histórico
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {wallet.isLoading && <ActivityIndicator color={theme.primary} style={styles.loading} />}
        {wallet.isError && (
          <Text style={[styles.feedback, { color: theme.danger }]}>
            Não foi possível carregar sua carteira. Verifique sua conexão.
          </Text>
        )}

        {data && (
          <>
            <View style={styles.balanceBlock}>
              <Text style={[styles.balanceLabel, { color: theme.primarySoftMeta }]}>
                DISPONÍVEL PARA SACAR
              </Text>
              <Text style={[styles.balanceValue, { color: theme.text }]}>
                {formatBRL(data.availableCents)}
              </Text>
              <Text style={[styles.balanceCaption, { color: theme.textSecondary }]}>
                recebido desde o seu último saque
              </Text>
            </View>

            <View style={[styles.tabs, { backgroundColor: theme.backgroundElement }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTab('available')}
                style={tabStyle(tab === 'available')}>
                <Text style={tabLabelStyle(tab === 'available')}>Disponível</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTab('processing')}
                style={tabStyle(tab === 'processing')}>
                <Text style={tabLabelStyle(tab === 'processing')}>
                  Em processamento{' '}
                  {data.processingEntries.length > 0 ? `(${data.processingEntries.length})` : ''}
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
              {status === 'signedOut' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/auth')}
                  style={[styles.signIn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.signInLabel, { color: theme.onPrimary }]}>
                    Entre para ver sua carteira
                  </Text>
                </Pressable>
              ) : tab === 'available' ? (
                data.availableEntries.length === 0 ? (
                  <Text style={[styles.feedback, { color: theme.textSecondary }]}>
                    Nada por aqui desde o seu último saque. Conclua um serviço para receber.
                  </Text>
                ) : (
                  data.availableEntries.map((entry) => (
                    <View
                      key={entry.id}
                      style={[styles.entry, { borderBottomColor: theme.line }]}>
                      <View style={styles.entryInfo}>
                        <Text
                          style={[styles.entryTitle, { color: theme.text }]}
                          numberOfLines={1}>
                          {entry.gigTitle ?? 'Movimentação'}
                        </Text>
                        <Text style={[styles.entryMeta, { color: theme.textSecondary }]}>
                          {entry.type === 'escrow_release'
                            ? receivedLabel(entry.createdAt, true)
                            : `${entryLabel(entry)} · ${receivedLabel(entry.createdAt, false)}`}
                        </Text>
                      </View>
                      <Text style={[styles.entryValue, { color: theme.success }]}>
                        + {formatBRL(entry.amountCents)}
                      </Text>
                    </View>
                  ))
                )
              ) : data.processingEntries.length === 0 ? (
                <Text style={[styles.feedback, { color: theme.textSecondary }]}>
                  Nenhum valor em processamento. Pagamentos de serviços concluídos ficam aqui
                  por {PROCESSING_HOLD_DAYS} dias antes de liberar.
                </Text>
              ) : (
                <>
                  {data.processingEntries.map((entry) => (
                    <View
                      key={entry.id}
                      style={[styles.entry, { borderBottomColor: theme.line }]}>
                      <View style={styles.entryInfo}>
                        <Text
                          style={[styles.entryTitle, { color: theme.text }]}
                          numberOfLines={1}>
                          {entry.gigTitle ?? 'Movimentação'}
                        </Text>
                        <Text style={[styles.entryMeta, { color: theme.warning }]}>
                          {entry.frozen ? 'em análise pela plataforma' : releaseLabel(entry.releasesAt)}
                        </Text>
                      </View>
                      <Text style={[styles.entryValue, { color: theme.warning }]}>
                        {formatBRL(entry.amountCents)}
                      </Text>
                    </View>
                  ))}
                  <Text style={[styles.holdNote, { color: theme.textSecondary }]}>
                    Serviços concluídos ficam {PROCESSING_HOLD_DAYS} dias em processamento e
                    liberam sozinhos.
                  </Text>
                </>
              )}

              {feedback && (
                <Text
                  style={[
                    styles.feedback,
                    { color: feedback.kind === 'error' ? theme.danger : theme.success },
                  ]}>
                  {feedback.text}
                </Text>
              )}
            </ScrollView>

            {status !== 'signedOut' && (
              <View style={styles.footer}>
                {pixKeyLabel && (
                  <View style={styles.destination}>
                    <Ionicons name="key" size={13} color={theme.textSecondary} />
                    <Text style={[styles.destinationText, { color: theme.textSecondary }]}>
                      Vai para sua chave Pix{' '}
                      <Text style={{ fontWeight: '700', color: theme.text }}>{pixKeyLabel}</Text>
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Alterar chave Pix"
                      onPress={() => router.push('/payout')}
                      hitSlop={8}>
                      <Text style={[styles.destinationLink, { color: theme.primarySoftText }]}>
                        alterar
                      </Text>
                    </Pressable>
                  </View>
                )}
                {needsPixKey && (
                  <View style={styles.destination}>
                    <Ionicons name="alert-circle" size={14} color={theme.warning} />
                    <Text style={[styles.destinationText, { color: theme.warning }]}>
                      Cadastre sua chave Pix para poder sacar
                    </Text>
                  </View>
                )}
                {needsPixKey ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/payout')}
                    style={[styles.withdraw, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.withdrawLabel, { color: theme.onPrimary }]}>
                      Cadastrar chave Pix
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!canWithdraw || withdrawal.isPending}
                    onPress={doWithdraw}
                    style={[
                      styles.withdraw,
                      {
                        backgroundColor: canWithdraw ? theme.primary : theme.backgroundSelected,
                        opacity: withdrawal.isPending ? 0.7 : 1,
                      },
                    ]}>
                    {withdrawal.isPending ? (
                      <ActivityIndicator color={theme.onPrimary} />
                    ) : (
                      <Text
                        style={[
                          styles.withdrawLabel,
                          { color: canWithdraw ? theme.onPrimary : theme.textSecondary },
                        ]}>
                        {!canWithdraw
                          ? 'Nada para sacar ainda'
                          : withdrawArmed
                            ? `Confirmar saque de ${formatBRL(data.availableCents)}`
                            : 'Sacar via Pix'}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  historyPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
  },
  historyLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  loading: {
    marginTop: Spacing.four,
  },
  balanceBlock: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: 2,
  },
  balanceLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceCaption: {
    fontSize: 11.5,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.medium - 3,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
  },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  entryMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  entryValue: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  holdNote: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16.5,
    marginTop: Spacing.two + 2,
  },
  feedback: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    padding: Spacing.two,
    lineHeight: 19,
  },
  signIn: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signInLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    padding: Spacing.three,
    paddingTop: Spacing.one,
    gap: Spacing.one + 2,
  },
  destination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  destinationText: {
    fontSize: 12,
  },
  destinationLink: {
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  withdraw: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  withdrawLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
