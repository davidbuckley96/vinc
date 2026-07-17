import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deriveAreaLabel, GENERIC_AREA_LABEL } from '@vinc/core';
import type { Category } from '@vinc/api';

import { DateRangeCalendar, type DateRange } from '@/components/date-range-calendar';
import { RadiusSlider } from '@/components/radius-slider';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { GigCard } from '../components/gig-card';
import { RegionModal } from '../components/region-modal';
import { useCategories, useMyReportedGigs, useOpenGigs } from '../hooks';
import { DEFAULT_RADIUS_KM, locateDevice, useRegion } from '../region';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0h–23h (B-06)

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Sem acentos + minúsculas, para casar "pintor" com "pintura" etc. */
const DIACRITICS = /[̀-ͯ]/g;
function normalize(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
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

/** Prefer the neighbourhood part of a geocoded label; keep full when there's none. */
function shortLabel(full: string): string {
  const area = deriveAreaLabel(full);
  return area === GENERIC_AREA_LABEL ? full : area;
}

/** Deep-link "2026-07-21" → local midnight Date (from the agenda's slot CTA). */
function parseDayParam(value?: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return startOfDay(new Date(y, m - 1, d));
}

/**
 * Search screen — "resultados primeiro" (H-03, rodada 24 opção A): a lista de
 * vagas abre já no topo; um único botão "Filtrar" abre uma gaveta com dia, hora,
 * categoria e distância (slider 10–100 km). Os filtros ativos viram chips
 * removíveis ao lado do botão. A distância padrão é 50 km ao redor do usuário
 * (D-074) para o app não parecer vazio quando ainda há poucas vagas.
 */
export function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ day?: string; hour?: string }>();

  // Filtros
  const initialDay = useMemo(() => parseDayParam(params.day), [params.day]);
  const [range, setRange] = useState<DateRange | null>(
    initialDay ? { start: initialDay, end: initialDay } : null,
  );
  const [hour, setHour] = useState<number | null>(
    initialDay && params.hour ? Number(params.hour) : null,
  );
  const [category, setCategory] = useState<Category | null>(null);
  // Busca por texto (rodada 25, Opção A): digitar "pintor" sem saber a categoria.
  const [query, setQuery] = useState('');

  // Modais
  const [filterOpen, setFilterOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  const categories = useCategories();

  // Tocar na aba "Buscar" volta a busca ao estado limpo (sem filtros, gaveta
  // fechada). Não mexe na região (é a localização persistida do usuário).
  useEffect(() => {
    const tabNav = navigation as unknown as {
      addListener: (event: 'tabPress', cb: () => void) => () => void;
    };
    const unsubscribe = tabNav.addListener('tabPress', () => {
      setRange(null);
      setHour(null);
      setCategory(null);
      setQuery('');
      setFilterOpen(false);
    });
    return unsubscribe;
  }, [navigation]);

  // Android hardware back: se a gaveta estiver aberta, fecha a gaveta; se houver
  // filtros ativos, limpa; senão deixa sair da aba.
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (filterOpen) {
          setFilterOpen(false);
          return true;
        }
        if (range || hour !== null || category || query) {
          setRange(null);
          setHour(null);
          setCategory(null);
          setQuery('');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [filterOpen, range, hour, category, query]),
  );

  // Vir de um horário da agenda (docs/17): a aba já está montada, então o
  // useState inicial não pega os params novos — aplicamos aqui.
  useEffect(() => {
    const day = parseDayParam(params.day);
    if (!day) return;
    setRange({ start: day, end: day });
    setHour(params.hour != null && params.hour !== '' ? Number(params.hour) : null);
    setCategory(null);
  }, [params.day, params.hour]);

  const singleDay = range !== null && sameDay(range.start, range.end);
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(today.getTime() + 86_400_000));
  const isToday = singleDay && sameDay(range!.start, today);
  const isTomorrow = singleDay && sameDay(range!.start, tomorrow);
  const customRange = range !== null && !isToday && !isTomorrow;

  const setDay = (day: Date | null) => {
    if (!day) {
      setRange(null);
      setHour(null);
      return;
    }
    setRange({ start: day, end: day });
    setHour(null);
  };

  const slot = useMemo(() => {
    if (!range) return undefined;
    const startsAt = startOfDay(range.start);
    const endsAt = startOfDay(range.end);
    if (sameDay(range.start, range.end) && hour !== null) {
      startsAt.setHours(hour, 0, 0, 0);
      endsAt.setHours(hour + 1, 0, 0, 0);
    } else {
      endsAt.setDate(endsAt.getDate() + 1);
    }
    return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
  }, [range, hour]);

  // Região (D-029): centro + raio. Padrão 50 km ao redor do usuário (D-074).
  const { region, setRegion, loaded: regionLoaded } = useRegion();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Primeiro uso da busca sem região definida: tenta pegar a localização do
  // aparelho e assume 50 km. Se o usuário negar, a região fica nula e a busca
  // mostra vagas de todo lugar (nunca uma lista vazia por causa do raio).
  useEffect(() => {
    if (!regionLoaded || region) return;
    let active = true;
    locateDevice().then((r) => {
      if (active && r.ok) {
        setRegion({
          lat: r.lat,
          lng: r.lng,
          label: shortLabel(r.label),
          radiusKm: DEFAULT_RADIUS_KM,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [regionLoaded, region, setRegion]);

  const useMyLocation = async () => {
    setLocateError(null);
    setLocating(true);
    const r = await locateDevice();
    setLocating(false);
    if (r.ok) {
      setRegion({
        lat: r.lat,
        lng: r.lng,
        label: shortLabel(r.label),
        radiusKm: region?.radiusKm ?? DEFAULT_RADIUS_KM,
      });
    } else {
      setLocateError('Não conseguimos pegar sua localização. Escolha no mapa.');
    }
  };

  const setRadius = (radiusKm: number) => {
    if (region) setRegion({ ...region, radiusKm });
  };

  // D-041: selecionar categoria-pai inclui as subcategorias.
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

  const categoryName = (id: string) => {
    const item = categories.data?.find((entry) => entry.id === id);
    if (!item) return undefined;
    const parent = item.parentId
      ? categories.data?.find((entry) => entry.id === item.parentId)
      : null;
    return parent ? `${parent.name} › ${item.name}` : item.name;
  };

  // Esconde vagas que denunciei (B-23).
  const reported = useMyReportedGigs();
  const notReported = (gigs.data ?? []).filter((gig) => !reported.data?.includes(gig.id));

  // Busca por texto (rodada 25, Opção A): cada palavra digitada precisa aparecer
  // no título, na descrição ou na categoria — assim "pintor" acha a vaga mesmo
  // sem saber em que categoria ela está.
  const queryTokens = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const visibleGigs =
    queryTokens.length === 0
      ? notReported
      : notReported.filter((gig) => {
          const hay = normalize(
            `${gig.title} ${gig.description} ${categoryName(gig.categoryId) ?? ''}`,
          );
          return queryTokens.every((token) => hay.includes(token));
        });
  const resultCount = visibleGigs.length;

  // Chips removíveis dos filtros ativos (dia, hora, categoria).
  const dayChipLabel = isToday
    ? 'Hoje'
    : isTomorrow
      ? 'Amanhã'
      : range
        ? rangeLabel(range)
        : null;
  const activeCount =
    (range ? 1 : 0) + (hour !== null && singleDay ? 1 : 0) + (category ? 1 : 0);

  const rootCategories = categories.data?.filter((item) => !item.parentId) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                Procurar trabalhos
              </Text>
              {/* Busca por texto (rodada 25, Opção A): sempre visível no topo. */}
              <View style={[styles.searchField, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                <Ionicons name="search" size={17} color={theme.onPrimaryMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar serviço (ex.: pintor)"
                  placeholderTextColor={theme.onPrimaryMuted}
                  returnKeyType="search"
                  accessibilityLabel="Buscar vaga por palavra"
                  style={[styles.searchInput, { color: theme.onPrimary }]}
                />
                {query.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Limpar busca"
                    onPress={() => setQuery('')}
                    hitSlop={8}
                    style={[styles.searchClear, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
                    <Ionicons name="close" size={13} color={theme.onPrimary} />
                  </Pressable>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Barra de filtro: botão único + chips removíveis dos filtros ativos. */}
        <View style={styles.filterBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros"
            onPress={() => setFilterOpen(true)}
            style={[styles.filterBtn, { borderColor: theme.primary }]}>
            <Ionicons name="options-outline" size={17} color={theme.primary} />
            <Text style={[styles.filterBtnLabel, { color: theme.primary }]}>Filtrar</Text>
            {activeCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <Text style={[styles.filterBadgeLabel, { color: theme.onPrimary }]}>
                  {activeCount}
                </Text>
              </View>
            )}
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {dayChipLabel && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover filtro de dia: ${dayChipLabel}`}
                  onPress={() => setDay(null)}
                  style={[styles.activeChip, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.activeChipLabel, { color: theme.onPrimary }]}>
                    {dayChipLabel}
                  </Text>
                  <Ionicons name="close" size={13} color={theme.onPrimary} />
                </Pressable>
              )}
              {hour !== null && singleDay && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover filtro de hora: ${hour} horas`}
                  onPress={() => setHour(null)}
                  style={[styles.activeChip, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.activeChipLabel, { color: theme.onPrimary }]}>{hour}h</Text>
                  <Ionicons name="close" size={13} color={theme.onPrimary} />
                </Pressable>
              )}
              {category && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover filtro de categoria: ${category.name}`}
                  onPress={() => setCategory(null)}
                  style={[styles.activeChip, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.activeChipLabel, { color: theme.onPrimary }]}>
                    {category.name}
                  </Text>
                  <Ionicons name="close" size={13} color={theme.onPrimary} />
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>

        <Text style={[styles.count, { color: theme.textSecondary }]} numberOfLines={1}>
          {gigs.isSuccess
            ? `${resultCount === 1 ? '1 VAGA' : `${resultCount} VAGAS`}${
                query.trim() ? ` PARA “${query.trim().toUpperCase()}”` : region ? ' PERTO DE VOCÊ' : ''
              }`
            : 'BUSCANDO VAGAS…'}
        </Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {gigs.isLoading && <ActivityIndicator color={theme.primary} />}
          {gigs.isError && (
            <Text style={[styles.feedback, { color: theme.danger }]}>
              Não foi possível carregar as vagas. Verifique sua conexão.
            </Text>
          )}
          {gigs.isSuccess && resultCount === 0 && (
            <View style={styles.empty}>
              <Text style={[styles.feedback, { color: theme.textSecondary }]}>
                {query.trim() ? `Nenhuma vaga para “${query.trim()}”` : 'Nenhuma vaga aberta'}
                {category ? ' nesta categoria' : ''}
                {range !== null ? ' nesse período' : ''}
                {region ? ` até ${region.radiusKm} km de ${region.label}` : ''}. Volte mais tarde!
              </Text>
              {query.trim().length > 0 && (
                <Pressable accessibilityRole="button" onPress={() => setQuery('')}>
                  <Text style={[styles.emptyLink, { color: theme.primary }]}>Limpar a busca ›</Text>
                </Pressable>
              )}
              {region && (
                <Pressable accessibilityRole="button" onPress={() => setFilterOpen(true)}>
                  <Text style={[styles.emptyLink, { color: theme.primary }]}>
                    Aumentar a distância ou mudar os filtros ›
                  </Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={() => router.push('/alerts')}>
                <Text style={[styles.emptyLink, { color: theme.primary }]}>
                  🔔 Criar um alerta e te avisamos quando surgir ›
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.push('/post')}>
                <Text style={[styles.emptyLink, { color: theme.primary }]}>
                  Precisa de um serviço? Anunciar é grátis ›
                </Text>
              </Pressable>
            </View>
          )}
          {visibleGigs.map((gig) => (
            <GigCard
              key={gig.id}
              gig={gig}
              categoryName={categoryName(gig.categoryId)}
              onPress={() => router.push(`/gig/${gig.id}`)}
            />
          ))}
          {resultCount > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alertas de vagas"
              onPress={() => router.push('/alerts')}
              style={[styles.alertsCard, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
              <Ionicons name="notifications" size={18} color={theme.primarySoftText} />
              <Text style={[styles.alertsLabel, { color: theme.primarySoftText }]}>
                Criar um alerta e te avisamos quando surgir a vaga certa
              </Text>
              <Ionicons name="chevron-forward" size={17} color={theme.primarySoftMeta} />
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* GAVETA DE FILTROS ------------------------------------------------- */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar filtros"
            style={styles.backdrop}
            onPress={() => setFilterOpen(false)}
          />
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={[styles.grab, { backgroundColor: theme.line }]} />
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Filtrar vagas</Text>
              {activeCount > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setRange(null);
                    setHour(null);
                    setCategory(null);
                  }}>
                  <Text style={[styles.clearAll, { color: theme.primary }]}>Limpar filtros</Text>
                </Pressable>
              )}
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody}>
              {/* DIA */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DIA</Text>
              <View style={styles.wrapRow}>
                {[
                  { label: 'Qualquer', on: range === null, press: () => setDay(null) },
                  { label: 'Hoje', on: !!isToday, press: () => setDay(today) },
                  { label: 'Amanhã', on: !!isTomorrow, press: () => setDay(tomorrow) },
                  {
                    label: customRange ? `📅 ${rangeLabel(range!)}` : '📅 Escolher',
                    on: !!customRange,
                    press: () => setCalOpen(true),
                  },
                ].map((opt) => (
                  <Pressable
                    key={opt.label}
                    accessibilityRole="button"
                    onPress={opt.press}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: opt.on ? theme.primary : theme.background,
                        borderColor: opt.on ? theme.primary : theme.line,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipLabel,
                        { color: opt.on ? theme.onPrimary : theme.textSecondary },
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* HORA (só para um único dia) */}
              {singleDay && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HORA</Text>
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
                          Qualquer
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
                </>
              )}

              {/* CATEGORIA */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CATEGORIA</Text>
              <View style={styles.wrapRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCategory(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: category === null ? theme.primary : theme.background,
                      borderColor: category === null ? theme.primary : theme.line,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: category === null ? theme.onPrimary : theme.textSecondary },
                    ]}>
                    Todas
                  </Text>
                </Pressable>
                {rootCategories.map((item) => {
                  const on = category?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => setCategory(on ? null : item)}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: on ? theme.primary : theme.background,
                          borderColor: on ? theme.primary : theme.line,
                        },
                      ]}>
                      <Ionicons
                        name={(item.icon ?? 'briefcase') as keyof typeof Ionicons.glyphMap}
                        size={15}
                        color={on ? theme.onPrimary : theme.primary}
                      />
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: on ? theme.onPrimary : theme.text },
                        ]}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* DISTÂNCIA */}
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DISTÂNCIA</Text>
              {region ? (
                <View>
                  <RadiusSlider value={region.radiusKm} onChange={setRadius} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRegionOpen(true)}
                    style={styles.locRow}>
                    <Ionicons name="location" size={15} color={theme.primary} />
                    <Text style={[styles.locLabel, { color: theme.text }]} numberOfLines={1}>
                      {region.label}
                    </Text>
                    <Text style={[styles.locChange, { color: theme.primary }]}>mudar local</Text>
                  </Pressable>
                </View>
              ) : locating ? (
                <ActivityIndicator color={theme.primary} style={{ alignSelf: 'flex-start' }} />
              ) : (
                <View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={useMyLocation}
                    style={[styles.locBtn, { backgroundColor: theme.primary }]}>
                    <Ionicons name="navigate" size={15} color={theme.onPrimary} />
                    <Text style={[styles.locBtnLabel, { color: theme.onPrimary }]}>
                      Usar minha localização
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRegionOpen(true)}
                    style={[styles.locBtnGhost, { borderColor: theme.primary }]}>
                    <Text style={[styles.locBtnLabel, { color: theme.primary }]}>
                      🗺 Escolher no mapa
                    </Text>
                  </Pressable>
                  {locateError && (
                    <Text style={[styles.hint, { color: theme.danger }]}>{locateError}</Text>
                  )}
                  <Text style={[styles.hint, { color: theme.textSecondary }]}>
                    Sem localização, mostramos vagas de qualquer lugar.
                  </Text>
                </View>
              )}
            </ScrollView>

            <SafeAreaView edges={['bottom']}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFilterOpen(false)}
                style={[styles.cta, { backgroundColor: theme.primary }]}>
                <Text style={[styles.ctaLabel, { color: theme.onPrimary }]}>
                  {gigs.isSuccess
                    ? `Ver ${resultCount === 1 ? '1 vaga' : `${resultCount} vagas`}`
                    : 'Ver vagas'}
                </Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Calendário e seletor de local ficam na raiz para abrir por cima da gaveta. */}
      <DateRangeCalendar
        visible={calOpen}
        range={range}
        onConfirm={(picked) => {
          setRange(picked);
          setHour(null);
        }}
        onClose={() => setCalOpen(false)}
      />
      <RegionModal
        visible={regionOpen}
        region={region}
        onChange={setRegion}
        onClose={() => setRegionOpen(false)}
        showRadius={false}
      />
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  searchClear: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 7,
  },
  filterBtnLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.one + 4,
    paddingVertical: 7,
  },
  activeChipLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  count: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two + 2,
  },
  empty: {
    alignItems: 'center',
    gap: 3,
  },
  emptyLink: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  feedback: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  alertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radius.large,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: Spacing.one,
  },
  alertsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  // Gaveta
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,18,30,0.34)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    maxHeight: '86%',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginVertical: Spacing.two,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  clearAll: {
    fontSize: 13,
    fontWeight: '800',
  },
  sheetBody: {
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: Spacing.two + 2,
    marginBottom: Spacing.one + 2,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
  },
  locLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  locChange: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: Radius.medium,
    paddingVertical: 11,
  },
  locBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 11,
    marginTop: Spacing.one + 2,
  },
  locBtnLabel: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: Spacing.one + 2,
  },
  cta: {
    borderRadius: Radius.medium,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.one,
    marginBottom: Spacing.one,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
