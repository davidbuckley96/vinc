import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import type { TimeBand } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { RegionModal } from '@/features/gigs/components/region-modal';
import { useCategories } from '@/features/gigs/hooks';
import type { Region } from '@/features/gigs/region';
import { useTheme } from '@/hooks/use-theme';

import { useCreateAlert } from '../hooks';
import { TIME_BANDS, WEEKDAYS_SHORT } from '../labels';

/**
 * Create a job alert (B-30 fatia 3, D-064): service + days + time bands +
 * optional region. When a matching gig is posted, the user is notified
 * (in-app + push). Empty days/bands mean "any".
 */
export function CreateAlertScreen() {
  const theme = useTheme();
  const router = useRouter();
  const categories = useCategories();
  const create = useCreateAlert();

  // Categorias do alerta; vazio = TODAS (V-07). Começa em "todas".
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [bands, setBands] = useState<TimeBand[]>([]);
  const [region, setRegion] = useState<Region | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roots = (categories.data ?? []).filter((c) => !c.parentId);
  const allCategories = categoryIds.length === 0;

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const toggleBand = (b: TimeBand) =>
    setBands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const save = async () => {
    setError(null);
    // Nenhuma categoria = todas (V-07) — sempre válido.
    const result = await create.mutateAsync({
      categoryIds,
      days,
      timeBands: bands,
      region: region
        ? { lat: region.lat, lng: region.lng, radiusKm: region.radiusKm, label: region.label }
        : null,
      pushEnabled,
    });
    if (result) router.back();
    else setError('Não foi possível salvar o alerta. Tente de novo.');
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
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Criar alerta</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={[styles.intro, { color: theme.textSecondary }]}>
            Avisamos quando surgir uma vaga que combina com o que você escolher.
          </Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            SERVIÇOS (ESCOLHA UM OU MAIS)
          </Text>
          {categories.isLoading && <ActivityIndicator color={theme.primary} />}
          <View style={styles.chips}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryIds([])}
              style={[
                styles.chip,
                { backgroundColor: allCategories ? theme.primary : theme.background, borderColor: allCategories ? theme.primary : theme.line },
              ]}>
              <Text style={[styles.chipLabel, { color: allCategories ? theme.onPrimary : theme.textSecondary }]}>
                Todas as categorias
              </Text>
            </Pressable>
            {roots.map((cat) => {
              const on = categoryIds.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  accessibilityRole="button"
                  onPress={() => toggleCategory(cat.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: on ? theme.primary : theme.background, borderColor: on ? theme.primary : theme.line },
                  ]}>
                  <Text style={[styles.chipLabel, { color: on ? theme.onPrimary : theme.textSecondary }]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>DIAS (VAZIO = TODO DIA)</Text>
          <View style={styles.chips}>
            {WEEKDAYS_SHORT.map((name, index) => {
              const on = days.includes(index);
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  onPress={() => toggleDay(index)}
                  style={[
                    styles.chip,
                    { backgroundColor: on ? theme.primary : theme.background, borderColor: on ? theme.primary : theme.line },
                  ]}>
                  <Text style={[styles.chipLabel, { color: on ? theme.onPrimary : theme.textSecondary }]}>
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            HORÁRIO (VAZIO = QUALQUER HORA)
          </Text>
          <View style={styles.chips}>
            {TIME_BANDS.map((band) => {
              const on = bands.includes(band.key);
              return (
                <Pressable
                  key={band.key}
                  accessibilityRole="button"
                  onPress={() => toggleBand(band.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: on ? theme.primary : theme.background, borderColor: on ? theme.primary : theme.line },
                  ]}>
                  <Text style={[styles.chipLabel, { color: on ? theme.onPrimary : theme.textSecondary }]}>
                    {band.label} · {band.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>REGIÃO (OPCIONAL)</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRegionOpen(true)}
            style={[styles.regionBar, { borderColor: theme.line }]}>
            <Ionicons name="location-outline" size={16} color={theme.primary} />
            <Text style={[styles.regionLabel, { color: region ? theme.text : theme.textSecondary }]} numberOfLines={1}>
              {region ? `${region.label} · até ${region.radiusKm} km` : 'Qualquer lugar'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>

          <View style={[styles.pushRow, { borderColor: theme.line }]}>
            <View style={styles.pushText}>
              <Text style={[styles.pushLabel, { color: theme.text }]}>🔔 Avisar por push</Text>
              <Text style={[styles.pushHint, { color: theme.textSecondary }]}>
                Notificação no celular quando surgir a vaga.
              </Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} />
          </View>

          {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={create.isPending}
            onPress={save}
            style={[styles.cta, { backgroundColor: theme.primary, opacity: create.isPending ? 0.7 : 1 }]}>
            {create.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.ctaLabel, { color: theme.onPrimary }]}>Salvar alerta</Text>
            )}
          </Pressable>
        </ScrollView>

        <RegionModal
          visible={regionOpen}
          region={region}
          onChange={setRegion}
          onClose={() => setRegionOpen(false)}
        />
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
  intro: { fontSize: 13, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 7,
  },
  chipLabel: { fontSize: 12.5, fontWeight: '700' },
  regionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    paddingVertical: 12,
  },
  regionLabel: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  pushText: { flex: 1, gap: 1 },
  pushLabel: { fontSize: 13.5, fontWeight: '700' },
  pushHint: { fontSize: 11.5, lineHeight: 15 },
  error: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: { fontSize: 15, fontWeight: '800' },
});
