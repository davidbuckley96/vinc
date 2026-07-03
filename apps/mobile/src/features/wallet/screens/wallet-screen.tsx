import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LedgerEntry } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { useWallet } from '../hooks';

const ENTRY_LABELS: Record<LedgerEntry['type'], string> = {
  escrow_release: 'pagamento recebido',
  escrow_hold: 'valor reservado',
  fee: 'taxa da plataforma',
  fine: 'multa',
  refund: 'reembolso',
  withdrawal: 'saque',
};

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(date, today)) return 'HOJE';
  if (same(date, yesterday)) return 'ONTEM';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(date)
    .toUpperCase();
}

/** Wallet — two cards (available / incoming) + day-grouped ledger (D-008). */
export function WalletScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status } = useSession();
  const wallet = useWallet();

  const groups: { label: string; entries: LedgerEntry[] }[] = [];
  for (const entry of wallet.data?.entries ?? []) {
    const label = dayLabel(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Carteira</Text>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {wallet.isLoading && <ActivityIndicator color={theme.primary} />}
          {wallet.isError && (
            <Text style={[styles.feedback, { color: theme.danger }]}>
              Não foi possível carregar sua carteira. Verifique sua conexão.
            </Text>
          )}

          {wallet.data && (
            <>
              <View style={styles.cards}>
                <View style={[styles.card, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.cardLabel, { color: theme.primarySoftMeta }]}>
                    DISPONÍVEL
                  </Text>
                  <Text style={[styles.cardValue, { color: theme.primarySoftText }]}>
                    {formatBRL(wallet.data.balanceCents)}
                  </Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.cardLabel, { color: theme.success }]}>A RECEBER</Text>
                  <Text style={[styles.cardValue, { color: theme.success }]}>
                    {formatBRL(wallet.data.pendingCents)}
                  </Text>
                </View>
              </View>

              {status === 'signedOut' && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/auth')}
                  style={[styles.signIn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.signInLabel, { color: theme.onPrimary }]}>
                    Entre para ver sua carteira
                  </Text>
                </Pressable>
              )}

              {groups.length === 0 && status !== 'signedOut' ? (
                <Text style={[styles.feedback, { color: theme.textSecondary }]}>
                  Seu extrato aparece aqui: aceite um serviço ou anuncie uma vaga para
                  começar.
                </Text>
              ) : (
                groups.map((group) => (
                  <View key={group.label} style={styles.group}>
                    <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
                      {group.label}
                    </Text>
                    {group.entries.map((entry) => (
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
                            {ENTRY_LABELS[entry.type]}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.entryValue,
                            { color: entry.amountCents >= 0 ? theme.success : theme.danger },
                          ]}>
                          {entry.amountCents >= 0 ? '+ ' : '− '}
                          {formatBRL(Math.abs(entry.amountCents))}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              )}

              <View style={[styles.withdraw, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={[styles.withdrawLabel, { color: theme.textSecondary }]}>
                  Sacar para minha conta (em breve)
                </Text>
              </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  cards: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  card: {
    flex: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: 2,
  },
  cardLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  signIn: {
    borderRadius: Radius.medium,
    paddingVertical: 13,
    alignItems: 'center',
  },
  signInLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedback: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  group: {
    gap: 2,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
    marginBottom: 2,
  },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two + 1,
    borderBottomWidth: 1,
    gap: Spacing.three,
  },
  entryInfo: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  entryMeta: {
    fontSize: 11.5,
    marginTop: 1,
  },
  entryValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  withdraw: {
    borderRadius: Radius.medium,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  withdrawLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
