import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCategories } from '@/features/gigs/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useDeleteAlert, useMyAlerts, useSetAlertActive } from '../hooks';
import { alertSummary } from '../labels';

/**
 * Manage job alerts (B-30 fatia 3, D-064): list saved alerts with an on/off
 * switch (keeps the alert without deleting) and a remove action; "+ novo
 * alerta" opens the creation form.
 */
export function ManageAlertsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const alerts = useMyAlerts();
  const categories = useCategories();
  const toggle = useSetAlertActive();
  const remove = useDeleteAlert();

  const categoryLabel = (ids: string[]) => {
    if (ids.length === 0) return 'Todas as categorias';
    const names = ids.map((id) => categories.data?.find((c) => c.id === id)?.name ?? 'Serviço');
    return names.join(', ');
  };

  const list = alerts.data ?? [];

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
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                Meus alertas de vagas
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {alerts.isLoading && <ActivityIndicator color={theme.primary} />}

          {alerts.isSuccess && list.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Nenhum alerta ainda
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                Crie um alerta e avisamos assim que surgir uma vaga do seu jeito.
              </Text>
            </View>
          )}

          {list.map((alert) => (
            <View key={alert.id} style={[styles.card, { borderColor: theme.line }]}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                    {categoryLabel(alert.categoryIds)}
                  </Text>
                  <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                    {alertSummary(alert)}
                  </Text>
                </View>
                <Switch
                  value={alert.active}
                  onValueChange={(active) => toggle.mutate({ alertId: alert.id, active })}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => remove.mutate(alert.id)}
                hitSlop={8}
                style={styles.removeLink}>
                <Ionicons name="trash-outline" size={13} color={theme.danger} />
                <Text style={[styles.removeLabel, { color: theme.danger }]}>Remover</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/alerts/new')}
            style={[styles.add, { borderColor: theme.primary }]}>
            <Ionicons name="add" size={18} color={theme.primary} />
            <Text style={[styles.addLabel, { color: theme.primary }]}>Novo alerta</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: { borderBottomLeftRadius: Radius.xlarge, borderBottomRightRadius: Radius.xlarge },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  empty: { alignItems: 'center', gap: 6, paddingVertical: Spacing.four },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyBody: { fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: Spacing.three },
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.large - 2,
    padding: Spacing.two + 2,
    gap: Spacing.one,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14.5, fontWeight: '800' },
  cardMeta: { fontSize: 12, lineHeight: 16 },
  removeLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  removeLabel: { fontSize: 12, fontWeight: '700' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: 13,
    marginTop: Spacing.one,
  },
  addLabel: { fontSize: 13.5, fontWeight: '800' },
});
