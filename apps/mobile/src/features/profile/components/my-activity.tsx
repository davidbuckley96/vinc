import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AgendaEntry } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useMyActivity } from '../hooks';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function whenLabel(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  return `${WEEKDAYS[s.getDay()]} ${s.getDate()} · ${s.getHours()}h–${e.getHours()}h`;
}

/**
 * "Minhas vagas e candidaturas" no perfil (B-28): o usuário vê e gerencia
 * as vagas abertas que anunciou (toca → tela do serviço, onde exclui/escolhe)
 * e as candidaturas que enviou (toca → vaga, onde desiste).
 */
export function MyActivity() {
  const theme = useTheme();
  const router = useRouter();
  const activity = useMyActivity();

  const openGigs = activity.data?.openGigs ?? [];
  const candidacies = activity.data?.candidacies ?? [];
  if (activity.isSuccess && openGigs.length === 0 && candidacies.length === 0) return null;

  const row = (entry: AgendaEntry, onPress: () => void) => (
    <Pressable
      key={entry.id}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderColor: theme.line }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]} numberOfLines={1}>
          {whenLabel(entry.startsAt, entry.endsAt)} · {formatBRL(entry.priceCents)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <View style={styles.root}>
      {openGigs.length > 0 && (
        <>
          <Text style={[styles.title, { color: theme.textSecondary }]}>
            MINHAS VAGAS ABERTAS ({openGigs.length})
          </Text>
          {openGigs.map((gig) => row(gig, () => router.push(`/service/${gig.id}`)))}
        </>
      )}
      {candidacies.length > 0 && (
        <>
          <Text style={[styles.title, { color: theme.textSecondary }]}>
            MINHAS CANDIDATURAS ({candidacies.length})
          </Text>
          {candidacies.map((c) => row(c, () => router.push(`/gig/${c.id}`)))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.one + 2, width: '100%' },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 11,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 1 },
});
