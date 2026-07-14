import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { OpenGig } from '@vinc/api';
import {
  computeGigPricing,
  deriveAreaLabel,
  formatBRL,
  validateGigDraft,
  type GigDraft,
  type GigDraftError,
} from '@vinc/core';

import { HourPicker } from '@/components/hour-picker';
import { LocationPicker, type PickedLocation } from '@/components/location-map';
import { MonthCalendar } from '@/components/month-calendar';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { useCategories } from '../hooks';
import { GigCard } from './gig-card';

const ERROR_MESSAGES: Record<GigDraftError, string> = {
  category_required: 'Escolha a categoria do serviço.',
  title_too_short: 'Descreva o serviço no título (mínimo 3 letras).',
  title_too_long: 'O título está longo demais (máximo 80 letras).',
  description_too_long: 'A descrição está longa demais.',
  starts_in_past: 'Escolha um horário no futuro.',
  ends_before_starts: 'O fim precisa ser depois do início.',
  price_required: 'Diga quanto vai pagar.',
  price_too_low: 'O valor mínimo de uma vaga é R$ 10,00.',
  address_required: 'Escolha o local do serviço no mapa.',
  location_invalid: 'Não foi possível marcar o local. Escolha de novo no mapa.',
  location_outside_brazil: 'O local precisa ser dentro do Brasil.',
};

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
// Every hour of the day is allowed (D-053): serviços de madrugada existem.
const START_HOURS = Array.from({ length: 24 }, (_, i) => i); // 0h–23h
const fmtHour = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

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

/** "Hoje", "Amanhã" or "seg, 21 jul" for the day chip/button. */
function dayLabel(date: Date, now: Date): string {
  const today = startOfDay(now);
  const tomorrow = startOfDay(new Date(today.getTime() + 86400000));
  if (sameDay(date, today)) return 'Hoje';
  if (sameDay(date, tomorrow)) return 'Amanhã';
  return `${WEEKDAYS[date.getDay()].slice(0, 3)}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** hour may be 24 → next-day 00:00 (a gig ending at/after midnight). */
function buildIso(day: Date, hour: number): string {
  const date = new Date(day);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export interface GigFormFeedback {
  kind: 'error' | 'success';
  text: string;
}

interface GigFormProps {
  /** Prefill for edit mode; omit for a blank create form. */
  initial?: GigDraft;
  /** Edit mode: the price was paid at creation and cannot change (D-017). */
  priceLocked?: boolean;
  submitLabel: string;
  pending: boolean;
  /** Submit result coming from the parent (success or server error). */
  feedback: GigFormFeedback | null;
  /** Called only with a draft that passed validation. */
  onSubmit: (draft: GigDraft) => void;
}

/**
 * Gig form shared by the post (create) and edit screens — compact fields
 * with a live preview of the listing exactly as workers will see it (D-007).
 */
export function GigForm({
  initial,
  priceLocked = false,
  submitLabel,
  pending,
  feedback,
  onSubmit,
}: GigFormProps) {
  const theme = useTheme();
  const { session, userName } = useSession();
  const categories = useCategories();
  // The wallet balance shows up at PAYMENT time (D-021): a line in the fee
  // box tells the poster their balance covers (part of) this gig.

  // Absolute day (midnight) instead of an index into a frozen list — safe
  // across midnight (D-053): a stale "hoje" can't create a gig in the past.
  const initialDate = useMemo(
    () => startOfDay(initial ? new Date(initial.startsAt) : new Date(new Date().getTime() + 86400000)),
    [initial],
  );

  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  // Category tree (D-041): the top row picks the parent; a second row of
  // subcategories appears when the parent has children ("Geral" = parent).
  const allCategories = categories.data ?? [];
  const parents = allCategories.filter((item) => !item.parentId);
  const selectedEntry = allCategories.find((item) => item.id === categoryId);
  const selectedParentId = selectedEntry?.parentId ?? selectedEntry?.id ?? null;
  const subcategories = allCategories.filter((item) => item.parentId === selectedParentId);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [startHour, setStartHour] = useState(
    initial ? new Date(initial.startsAt).getHours() : 14,
  );
  const [endHour, setEndHour] = useState(initial ? new Date(initial.endsAt).getHours() : 17);
  const [priceCents, setPriceCents] = useState(initial?.priceCents ?? 0);
  const [location, setLocation] = useState<PickedLocation | null>(
    initial?.address
      ? { address: initial.address, lat: initial.lat ?? 0, lng: initial.lng ?? 0 }
      : null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedDay = selectedDate;

  // No past hours (D-007/D-053): on today, a gig can only START in an hour
  // strictly after the current one; other days offer the full 24h. `now` is
  // read fresh on each render, so it stays correct even across midnight.
  const now = new Date();
  const nowHour = now.getHours();
  const startHoursFor = (d: Date) =>
    START_HOURS.filter((h) => !sameDay(d, now) || h > nowHour);
  const availableStartHours = startHoursFor(selectedDay);
  // End can run up to 24 (= next-day midnight), so late-night gigs work.
  const availableEndHours = Array.from({ length: 24 - startHour }, (_, i) => startHour + 1 + i);
  const todayHasSlots = startHoursFor(startOfDay(now)).length > 0;

  // Change the day AND re-clamp start/end in the same handler (no effect):
  // on a day whose remaining hours differ (e.g. switching to today late in
  // the evening), move the start to the first still-valid hour.
  const changeDay = (d: Date) => {
    setSelectedDate(d);
    const avail = startHoursFor(d);
    if (avail.length === 0) return;
    if (!avail.includes(startHour)) {
      const first = avail[0]!;
      setStartHour(first);
      setEndHour(Math.min(first + 1, 24));
    } else if (endHour <= startHour) {
      setEndHour(Math.min(startHour + 1, 24));
    }
  };

  const pricing = computeGigPricing(priceCents);
  const hasPin = location !== null && !(location.lat === 0 && location.lng === 0);
  const draft: GigDraft = {
    categoryId,
    title,
    description,
    startsAt: buildIso(selectedDay, startHour),
    endsAt: buildIso(selectedDay, endHour),
    priceCents,
    address: location?.address ?? '',
    lat: hasPin ? location.lat : null,
    lng: hasPin ? location.lng : null,
  };

  const previewGig: OpenGig = {
    id: 'preview',
    posterId: session?.user.id ?? 'preview',
    title: title.trim() || 'Título do serviço',
    description,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    priceCents,
    // Candidates only see the area (D-028) — preview what THEY will see.
    area: location ? deriveAreaLabel(location.address) : 'Local',
    approxLat: hasPin ? location.lat : null,
    approxLng: hasPin ? location.lng : null,
    categoryId,
    posterName: userName ?? 'Você',
  };

  const submit = () => {
    setLocalError(null);
    const errors = validateGigDraft(draft, new Date());
    const firstError = errors[0];
    if (firstError) {
      setLocalError(ERROR_MESSAGES[firstError]);
      return;
    }
    onSubmit(draft);
  };

  const shownFeedback: GigFormFeedback | null = localError
    ? { kind: 'error', text: localError }
    : feedback;

  const inputStyle = [
    styles.input,
    { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
  ];
  const label = (text: string) => (
    <Text style={[styles.label, { color: theme.textSecondary }]}>{text}</Text>
  );

  const chip = (selected: boolean) => [
    styles.chip,
    {
      backgroundColor: selected ? theme.primary : theme.background,
      borderColor: selected ? theme.primary : theme.line,
    },
  ];
  const chipLabel = (selected: boolean) => [
    styles.chipLabel,
    { color: selected ? theme.onPrimary : theme.textSecondary },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {label('CATEGORIA')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {parents.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setCategoryId(item.id)}
              style={chip(selectedParentId === item.id)}>
              <Text style={chipLabel(selectedParentId === item.id)}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {subcategories.length > 0 && (
        <>
          {label('TIPO (OPCIONAL)')}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategoryId(selectedParentId!)}
                style={chip(categoryId === selectedParentId)}>
                <Text style={chipLabel(categoryId === selectedParentId)}>Geral</Text>
              </Pressable>
              {subcategories.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => setCategoryId(item.id)}
                  style={chip(categoryId === item.id)}>
                  <Text style={chipLabel(categoryId === item.id)}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {label('O QUE PRECISA SER FEITO?')}
      <TextInput
        style={inputStyle}
        placeholder="Ex.: Faxina apartamento 60m²"
        placeholderTextColor={theme.textSecondary}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
      />
      <TextInput
        style={[...inputStyle, styles.multiline]}
        placeholder="Detalhes do serviço esperado (opcional)"
        placeholderTextColor={theme.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {label('QUE DIA?')}
      {(() => {
        const today = startOfDay(now);
        const tomorrow = startOfDay(new Date(today.getTime() + 86400000));
        const isCustom = !sameDay(selectedDay, today) && !sameDay(selectedDay, tomorrow);
        return (
          <View style={styles.dayRow}>
            <Pressable
              accessibilityRole="button"
              disabled={!todayHasSlots}
              onPress={() => changeDay(startOfDay(new Date()))}
              style={[chip(sameDay(selectedDay, today)), !todayHasSlots && { opacity: 0.4 }]}>
              <Text style={chipLabel(sameDay(selectedDay, today))}>Hoje</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => changeDay(tomorrow)}
              style={chip(sameDay(selectedDay, tomorrow))}>
              <Text style={chipLabel(sameDay(selectedDay, tomorrow))}>Amanhã</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDayModalOpen(true)}
              style={chip(isCustom)}>
              <Text style={chipLabel(isCustom)}>
                📅 {isCustom ? dayLabel(selectedDay, now) : 'Outro dia'}
              </Text>
            </Pressable>
          </View>
        );
      })()}

      {label('HORÁRIO')}
      <View style={styles.timeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hora de início"
          onPress={() => setStartModalOpen(true)}
          style={[styles.timeField, { borderColor: theme.line, backgroundColor: theme.background }]}>
          <Text style={[styles.timeSmall, { color: theme.textSecondary }]}>Começa</Text>
          <Text style={[styles.timeBig, { color: theme.text }]}>{fmtHour(startHour)}</Text>
        </Pressable>
        <Text style={[styles.timeSep, { color: theme.textSecondary }]}>até</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hora de término"
          onPress={() => setEndModalOpen(true)}
          style={[styles.timeField, { borderColor: theme.line, backgroundColor: theme.background }]}>
          <Text style={[styles.timeSmall, { color: theme.textSecondary }]}>Termina</Text>
          <Text style={[styles.timeBig, { color: theme.text }]}>{fmtHour(endHour)}</Text>
        </Pressable>
      </View>

      <MonthCalendar
        visible={dayModalOpen}
        selected={selectedDay}
        onSelect={(d) => changeDay(d)}
        onClose={() => setDayModalOpen(false)}
      />
      <HourPicker
        visible={startModalOpen}
        title="A que horas começa?"
        value={startHour}
        hours={availableStartHours}
        onSelect={(h) => {
          setStartHour(h);
          if (h >= endHour) setEndHour(Math.min(h + 1, 24));
        }}
        onClose={() => setStartModalOpen(false)}
      />
      <HourPicker
        visible={endModalOpen}
        title="A que horas termina?"
        value={endHour}
        hours={availableEndHours}
        onSelect={(h) => setEndHour(h)}
        onClose={() => setEndModalOpen(false)}
      />

      {priceLocked ? (
        <>
          {label('QUANTO O PRESTADOR VAI RECEBER?')}
          <View style={[styles.feeBox, { backgroundColor: theme.primarySoft }]}>
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabelStrong, { color: theme.primarySoftText }]}>
                Valor combinado
              </Text>
              <Text style={[styles.feeValueStrong, { color: theme.primarySoftText }]}>
                {formatBRL(priceCents)}
              </Text>
            </View>
            <Text style={[styles.feeNote, { color: theme.primarySoftMeta }]}>
              O valor não pode ser alterado. Para combinar outro valor, exclua esta vaga (nada
              foi pago ainda) e crie uma nova.
            </Text>
          </View>
        </>
      ) : (
        <>
          {label('QUANTO O PRESTADOR VAI RECEBER?')}
          <TextInput
            style={inputStyle}
            placeholder="R$ 0,00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            value={priceCents ? formatBRL(priceCents) : ''}
            onChangeText={(text) => setPriceCents(Number(text.replace(/\D/g, '')))}
          />

          {priceCents > 0 && (
            <View style={[styles.feeBox, { backgroundColor: theme.primarySoft }]}>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: theme.primarySoftMeta }]}>
                  O prestador recebe
                </Text>
                <Text style={[styles.feeValue, { color: theme.primarySoftText }]}>
                  {formatBRL(pricing.netCents)}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: theme.primarySoftMeta }]}>
                  Taxa de serviço
                </Text>
                <Text style={[styles.feeValue, { color: theme.primarySoftText }]}>
                  + {formatBRL(pricing.feeCents)}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabelStrong, { color: theme.primarySoftText }]}>
                  Você paga
                </Text>
                <Text style={[styles.feeValueStrong, { color: theme.primarySoftText }]}>
                  {formatBRL(pricing.totalCents)}
                </Text>
              </View>
              <Text style={[styles.feeNote, { color: theme.primarySoftMeta }]}>
                💡 Publicar é grátis — você só paga quando escolher um candidato, por Pix.
              </Text>
            </View>
          )}
        </>
      )}

      {label('ONDE?')}
      <Pressable
        accessibilityRole="button"
        onPress={() => setPickerOpen(true)}
        style={[
          styles.input,
          styles.locationField,
          { borderColor: theme.line, backgroundColor: theme.background },
        ]}>
        <Text
          style={[
            styles.locationLabel,
            { color: location ? theme.text : theme.textSecondary },
          ]}
          numberOfLines={2}>
          🗺 {location ? location.address : 'Escolher o local no mapa'}
        </Text>
        <Text style={[styles.locationAction, { color: theme.primary }]}>
          {location ? 'mudar' : 'abrir'}
        </Text>
      </Pressable>
      <LocationPicker
        visible={pickerOpen}
        initial={hasPin ? location : null}
        onConfirm={(picked) => {
          setLocation(picked);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>
        PRÉVIA — é assim que os trabalhadores vão ver:
      </Text>
      <GigCard
        gig={previewGig}
        categoryName={
          selectedEntry
            ? selectedEntry.parentId
              ? `${parents.find((item) => item.id === selectedEntry.parentId)?.name} › ${selectedEntry.name}`
              : selectedEntry.name
            : undefined
        }
        highlighted
      />

      {shownFeedback && (
        <Text
          style={[
            styles.feedback,
            { color: shownFeedback.kind === 'error' ? theme.danger : theme.success },
          ]}>
          {shownFeedback.text}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={pending}
        onPress={submit}
        style={[styles.publish, { backgroundColor: theme.primary, opacity: pending ? 0.7 : 1 }]}>
        {pending ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={[styles.publishLabel, { color: theme.onPrimary }]}>{submitLabel}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    fontSize: 14.5,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two - 2,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two - 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeField: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 1,
  },
  timeSmall: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeBig: {
    fontSize: 20,
    fontWeight: '800',
  },
  timeSep: {
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  feedback: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  feeBox: {
    borderRadius: Radius.medium,
    padding: Spacing.two + 4,
    gap: 5,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  feeLabel: {
    fontSize: 12.5,
  },
  feeValue: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  feeLabelStrong: {
    fontSize: 13,
    fontWeight: '800',
  },
  feeValueStrong: {
    fontSize: 13,
    fontWeight: '800',
  },
  feeNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  publish: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  locationField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  locationLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  locationAction: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  publishLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
