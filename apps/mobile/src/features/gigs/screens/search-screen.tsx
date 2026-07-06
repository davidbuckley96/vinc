import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { GigCard } from '../components/gig-card';
import { useCategories, useOpenGigs } from '../hooks';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i); // 6h–23h

function dayChipLabel(date: Date, index: number): string {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Amanhã';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

/**
 * Search screen — "categories first" (D-007): big category tiles; tapping one
 * drills into that category's open gigs. Recent gigs are always visible below,
 * filterable by day/hour (the agenda's free-slot CTA lands here preselected).
 */
export function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string; hour?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const categories = useCategories();

  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);
        return date;
      }),
    [],
  );

  // Coming from a free agenda slot: preselect that day/hour.
  const initialDay = useMemo(() => {
    if (!params.day) return null;
    const index = days.findIndex(
      (day) =>
        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}` ===
        params.day,
    );
    return index >= 0 ? index : null;
  }, [params.day, days]);

  const [dayIndex, setDayIndex] = useState<number | null>(initialDay);
  const [hour, setHour] = useState<number | null>(
    initialDay !== null && params.hour ? Number(params.hour) : null,
  );

  const slot = useMemo(() => {
    if (dayIndex === null) return undefined;
    const day = days[dayIndex]!;
    const startsAt = new Date(day);
    const endsAt = new Date(day);
    if (hour !== null) {
      startsAt.setHours(hour, 0, 0, 0);
      endsAt.setHours(hour + 1, 0, 0, 0);
    } else {
      endsAt.setDate(endsAt.getDate() + 1);
    }
    return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  }, [dayIndex, hour, days]);

  const gigs = useOpenGigs(category?.id, slot);

  const categoryName = (id: string) =>
    categories.data?.find((item) => item.id === id)?.name;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              {category ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para as categorias"
                  onPress={() => setCategory(null)}
                  style={styles.back}>
                  <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
                  <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  O que você quer fazer?
                </Text>
              )}
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.filters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDayIndex(null);
                  setHour(null);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: dayIndex === null ? theme.primary : theme.background,
                    borderColor: dayIndex === null ? theme.primary : theme.line,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipLabel,
                    { color: dayIndex === null ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Qualquer dia
                </Text>
              </Pressable>
              {days.map((day, index) => (
                <Pressable
                  key={day.toISOString()}
                  accessibilityRole="button"
                  onPress={() => setDayIndex(index)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: dayIndex === index ? theme.primary : theme.background,
                      borderColor: dayIndex === index ? theme.primary : theme.line,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: dayIndex === index ? theme.onPrimary : theme.textSecondary },
                    ]}>
                    {dayChipLabel(day, index)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {dayIndex !== null && (
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
          {!category && (
            <>
              {categories.isLoading && <ActivityIndicator color={theme.primary} />}
              {categories.isError && (
                <Text style={[styles.feedback, { color: theme.danger }]}>
                  Não foi possível carregar as categorias. Verifique sua conexão.
                </Text>
              )}
              <View style={styles.grid}>
                {categories.data?.map((item) => (
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
          {gigs.data?.length === 0 && (
            <Text style={[styles.feedback, { color: theme.textSecondary }]}>
              Nenhuma vaga aberta{category ? ' nesta categoria' : ''}
              {dayIndex !== null ? ' nesse horário' : ''}. Volte mais tarde!
            </Text>
          )}
          {gigs.data?.map((gig) => (
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
