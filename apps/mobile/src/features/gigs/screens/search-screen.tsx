import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '@vinc/api';

import { DateRangeCalendar, type DateRange } from '@/components/date-range-calendar';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { GigCard } from '../components/gig-card';
import { RegionModal } from '../components/region-modal';
import { useCategories, useMyReportedGigs, useOpenGigs } from '../hooks';
import { useRegion } from '../region';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0h–23h (B-06)

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "qua 22" / "seg 21 – qua 23" for the selected range chip (B-05). */
function rangeLabel(range: DateRange): string {
  const one = (d: Date) => `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
  return sameDay(range.start, range.end)
    ? one(range.start)
    : `${one(range.start)} – ${one(range.end)}`;
}

/** Deep-link "2026-07-21" → local midnight Date (from the agenda's slot CTA). */
function parseDayParam(value?: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return startOfDay(new Date(y, m - 1, d));
}

/**
 * Search screen — "categories first" (D-007): big category tiles; tapping one
 * drills into that category's open gigs. Recent gigs are always visible below,
 * filterable by day/hour (the agenda's free-slot CTA lands here preselected).
 */
export function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ day?: string; hour?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  // "Ver todas as vagas" (B-03): lista as vagas de todas as categorias juntas.
  const [browseAll, setBrowseAll] = useState(false);
  const categories = useCategories();

  // Tapping the "Buscar" tab always returns to the top of search (root
  // categories), instead of reopening the last drilled-in subcategory.
  // tabPress fires on the tab icon only — not when popping back from a gig
  // detail — so browsing a category and viewing a gig still returns to it.
  useEffect(() => {
    // `tabPress` isn't in the generic navigator's event map types, but the
    // bottom-tab navigator emits it — narrow the listener locally.
    const tabNav = navigation as unknown as {
      addListener: (event: 'tabPress', cb: () => void) => () => void;
    };
    const unsubscribe = tabNav.addListener('tabPress', () => {
      setCategory(null);
      setBrowseAll(false);
    });
    return unsubscribe;
  }, [navigation]);

  // Android hardware back (B-04): if drilled into a category / "todas as vagas",
  // back returns to the category list instead of leaving the tab.
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (category || browseAll) {
          setCategory(null);
          setBrowseAll(false);
          return true; // handled — don't leave the tab
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [category, browseAll]),
  );

  // Date-range filter (B-05): a single day or a start→end span. Coming from a
  // free agenda slot, params.day preselects that day (and its hour).
  const initialDay = useMemo(() => parseDayParam(params.day), [params.day]);
  const [range, setRange] = useState<DateRange | null>(
    initialDay ? { start: initialDay, end: initialDay } : null,
  );
  const [hour, setHour] = useState<number | null>(
    initialDay && params.hour ? Number(params.hour) : null,
  );
  const [calOpen, setCalOpen] = useState(false);

  const singleDay = range !== null && sameDay(range.start, range.end);

  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(today.getTime() + 86_400_000));
  const isToday = singleDay && sameDay(range!.start, today);
  const isTomorrow = singleDay && sameDay(range!.start, tomorrow);
  // The calendar chip is "active" for any custom pick (a span, or a specific
  // day that isn't the Hoje/Amanhã shortcuts).
  const customRange = range !== null && !isToday && !isTomorrow;

  const setDay = (day: Date) => {
    setRange({ start: day, end: day });
    setHour(null);
  };

  const slot = useMemo(() => {
    if (!range) return undefined;
    const startsAt = startOfDay(range.start);
    const endsAt = startOfDay(range.end);
    // Hour only narrows a single day (a 1-hour window); a multi-day span
    // covers each day fully, so it ignores the hour.
    if (sameDay(range.start, range.end) && hour !== null) {
      startsAt.setHours(hour, 0, 0, 0);
      endsAt.setHours(hour + 1, 0, 0, 0);
    } else {
      endsAt.setDate(endsAt.getDate() + 1); // include the whole end day
    }
    return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  }, [range, hour]);

  // Region-scoped search (D-029): persisted; nearest gigs first.
  const { region, setRegion, loaded: regionLoaded } = useRegion();
  const [regionOpen, setRegionOpen] = useState(false);
  // D-041: selecting a parent category includes its subcategories.
  const selectedCategoryIds = category
    ? [
        category.id,
        ...(categories.data ?? [])
          .filter((item) => item.parentId === category.id)
          .map((item) => item.id),
      ]
    : undefined;
  const gigs = useOpenGigs(
    selectedCategoryIds,
    slot,
    regionLoaded && region
      ? { lat: region.lat, lng: region.lng, radiusKm: region.radiusKm }
      : undefined,
  );

  // Hide gigs I reported (B-23): a vaga denunciada não deve reaparecer.
  const reported = useMyReportedGigs();
  const visibleGigs = (gigs.data ?? []).filter(
    (gig) => !reported.data?.includes(gig.id),
  );

  const categoryName = (id: string) => {
    const item = categories.data?.find((entry) => entry.id === id);
    if (!item) return undefined;
    const parent = item.parentId
      ? categories.data?.find((entry) => entry.id === item.parentId)
      : null;
    return parent ? `${parent.name} › ${item.name}` : item.name;
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              {category || browseAll ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para as categorias"
                  onPress={() => {
                    setCategory(null);
                    setBrowseAll(false);
                  }}
                  style={styles.back}>
                  <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
                  <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                    {category ? category.name : 'Todas as vagas'}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  Procurar trabalhos
                </Text>
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.filters}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mudar a região da busca"
            onPress={() => setRegionOpen(true)}
            style={[styles.regionBar, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="location" size={15} color={theme.primarySoftText} />
            <Text
              style={[styles.regionLabel, { color: theme.primarySoftText }]}
              numberOfLines={1}>
              {region
                ? `${region.label} · até ${region.radiusKm} km`
                : 'Definir minha região'}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={theme.primarySoftMeta} />
          </Pressable>
          <RegionModal
            visible={regionOpen}
            region={region}
            onChange={setRegion}
            onClose={() => setRegionOpen(false)}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRange(null);
                  setHour(null);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: range === null ? theme.primary : theme.background,
                    borderColor: range === null ? theme.primary : theme.line,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: range === null ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Qualquer dia
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDay(today)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isToday ? theme.primary : theme.background,
                    borderColor: isToday ? theme.primary : theme.line,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isToday ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Hoje
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDay(tomorrow)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isTomorrow ? theme.primary : theme.background,
                    borderColor: isTomorrow ? theme.primary : theme.line,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isTomorrow ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Amanhã
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Escolher datas no calendário"
                onPress={() => setCalOpen(true)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: customRange ? theme.primary : theme.background,
                    borderColor: customRange ? theme.primary : theme.line,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: customRange ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  {customRange ? `📅 ${rangeLabel(range!)}` : '📅 Escolher datas'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
          <DateRangeCalendar
            visible={calOpen}
            range={range}
            onConfirm={(picked) => {
              setRange(picked);
              setHour(null);
            }}
            onClose={() => setCalOpen(false)}
          />
          {singleDay && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHour(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: hour === null ? theme.primary : theme.background,
                      borderColor: hour === null ? theme.primary : theme.line,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: hour === null ? theme.onPrimary : theme.textSecondary },
                    ]}>
                    Qualquer hora
                  </Text>
                </Pressable>
                {HOURS.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    onPress={() => setHour(value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: hour === value ? theme.primary : theme.background,
                        borderColor: hour === value ? theme.primary : theme.line,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: hour === value ? theme.onPrimary : theme.textSecondary },
                      ]}>
                      {value}h
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {!category && !browseAll && (
            <>
              {categories.isLoading && <ActivityIndicator color={theme.primary} />}
              {categories.isError && (
                <Text style={[styles.feedback, { color: theme.danger }]}>
                  Não foi possível carregar as categorias. Verifique sua conexão.
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => setBrowseAll(true)}
                style={[styles.allButton, { backgroundColor: theme.primary }]}>
                <Ionicons name="apps" size={17} color={theme.onPrimary} />
                <Text style={[styles.allButtonLabel, { color: theme.onPrimary }]}>
                  Ver todas as vagas
                </Text>
              </Pressable>
              <View style={styles.grid}>
                {categories.data?.filter((item) => !item.parentId).map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => setCategory(item)}
                    style={[styles.tile, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons
                      name={(item.icon ?? 'briefcase') as keyof typeof Ionicons.glyphMap}
                      size={26}
                      color={theme.primarySoftText}
                    />
                    <Text style={[styles.tileLabel, { color: theme.primarySoftText }]}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                VAGAS RECENTES
              </Text>
            </>
          )}

          {gigs.isLoading && <ActivityIndicator color={theme.primary} />}
          {gigs.isError && (
            <Text style={[styles.feedback, { color: theme.danger }]}>
              Não foi possível carregar as vagas. Verifique sua conexão.
            </Text>
          )}
          {gigs.isSuccess && visibleGigs.length === 0 &&
            (region ? (
              <View style={styles.emptyRegion}>
                <Text style={[styles.feedback, { color: theme.textSecondary }]}>
                  Nenhuma vaga aberta até {region.radiusKm} km de {region.label}
                  {category ? ' nesta categoria' : ''}
                  {range !== null ? ' nesse período' : ''}.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => setRegionOpen(true)}>
                  <Text style={[styles.emptyRegionLink, { color: theme.primary }]}>
                    Aumentar o raio ou mudar o local ›
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push('/post')}>
                  <Text style={[styles.emptyRegionLink, { color: theme.primary }]}>
                    Precisa de um serviço? Seja o primeiro a anunciar aqui — é grátis ›
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyRegion}>
                <Text style={[styles.feedback, { color: theme.textSecondary }]}>
                  Nenhuma vaga aberta{category ? ' nesta categoria' : ''}
                  {range !== null ? ' nesse período' : ''}. Volte mais tarde!
                </Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/post')}>
                  <Text style={[styles.emptyRegionLink, { color: theme.primary }]}>
                    Precisa de um serviço? Anunciar é grátis ›
                  </Text>
                </Pressable>
              </View>
            ))}
          {visibleGigs.map((gig) => (
            <GigCard
              key={gig.id}
              gig={gig}
              categoryName={categoryName(gig.categoryId)}
              onPress={() => router.push(`/gig/${gig.id}`)}
            />
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
  filters: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.one + 2,
  },
  regionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 3,
  },
  regionLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyRegion: {
    alignItems: 'center',
    gap: 2,
  },
  emptyRegionLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  headerRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: -6,
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
    gap: Spacing.two + 2,
  },
  allButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.medium,
    paddingVertical: 12,
  },
  allButtonLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  feedback: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
});
