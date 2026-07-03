import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LedgerEntry } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useWallet } from '../hooks';
import { dayLabel, entryLabel } from '../labels';

/**
 * Full statement — every payment and receipt, day-grouped, newest first
 * (docs/02 §5.2: lives behind the wallet's "Ver histórico" button).
 */
export function WalletHistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Histórico</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {wallet.isLoading && <ActivityIndicator color={theme.primary} />}
          {wallet.isError && (
            <Text style={[styles.feedback, { color: theme.danger }]}>
              Não foi possível carregar o histórico. Verifique sua conexão.
            </Text>
          )}

          {wallet.data && groups.length === 0 && (
            <Text style={[styles.feedback, { color: theme.textSecondary }]}>
              Nenhuma movimentação ainda.
            </Text>
          )}

          {groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
                {group.label}
              </Text>
              {group.entries.map((entry) => (
                <View key={entry.id} style={[styles.entry, { borderBottomColor: theme.line }]}>
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryTitle, { color: theme.text }]} numberOfLines={1}>
                      {entry.gigTitle ?? (entry.type === 'withdrawal' ? 'Saque' : 'Movimentação')}
                    </Text>
                    <Text style={[styles.entryMeta, { color: theme.textSecondary }]}>
                      {entryLabel(entry)}
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
          ))}
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
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
  },
  group: {
    marginBottom: Spacing.two,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
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
  feedback: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    padding: Spacing.two,
  },
});
