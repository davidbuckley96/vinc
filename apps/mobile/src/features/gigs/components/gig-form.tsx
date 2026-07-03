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
  formatBRL,
  validateGigDraft,
  type GigDraft,
  type GigDraftError,
} from '@vinc/core';

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
  address_required: 'Diga onde será o serviço.',
};

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i); // 6h–23h

function dayLabel(date: Date, index: number): string {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Amanhã';
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

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

  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
      }),
    [],
  );

  const initialDayIndex = useMemo(() => {
    if (!initial) return 1;
    const start = new Date(initial.startsAt);
    const index = days.findIndex(
      (day) =>
        day.getFullYear() === start.getFullYear() &&
        day.getMonth() === start.getMonth() &&
        day.getDate() === start.getDate(),
    );
    return index >= 0 ? index : 1;
  }, [initial, days]);

  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [dayIndex, setDayIndex] = useState(initialDayIndex);
  const [startHour, setStartHour] = useState(
    initial ? new Date(initial.startsAt).getHours() : 14,
  );
  const [endHour, setEndHour] = useState(initial ? new Date(initial.endsAt).getHours() : 17);
  const [priceCents, setPriceCents] = useState(initial?.priceCents ?? 0);
  const [address, setAddress] = useState(initial?.address ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedDay = days[dayIndex] ?? days[0]!;
  const pricing = computeGigPricing(priceCents);
  const draft: GigDraft = {
    categoryId,
    title,
    description,
    startsAt: buildIso(selectedDay, startHour),
    endsAt: buildIso(selectedDay, endHour),
    priceCents,
    address,
  };

  const previewGig: OpenGig = {
    id: 'preview',
    posterId: session?.user.id ?? 'preview',
    title: title.trim() || 'Título do serviço',
    description,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    priceCents,
    address: address.trim() || 'Local',
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
          {categories.data?.map((item) => (
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {days.map((day, index) => (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              onPress={() => setDayIndex(index)}
              style={chip(dayIndex === index)}>
              <Text style={chipLabel(dayIndex === index)}>{dayLabel(day, index)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {label('DAS')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {HOURS.map((hour) => (
            <Pressable
              key={hour}
              accessibilityRole="button"
              onPress={() => {
                setStartHour(hour);
                if (hour >= endHour) setEndHour(Math.min(hour + 1, 23));
              }}
              style={chip(startHour === hour)}>
              <Text style={chipLabel(startHour === hour)}>{hour}h</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {label('ATÉ')}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {HOURS.filter((hour) => hour > startHour).map((hour) => (
            <Pressable
              key={hour}
              accessibilityRole="button"
              onPress={() => setEndHour(hour)}
              style={chip(endHour === hour)}>
              <Text style={chipLabel(endHour === hour)}>{hour}h</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

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
              O valor não pode ser alterado. Para pagar outro valor, exclua esta vaga (o valor
              do prestador volta para você) e crie uma nova.
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
                  Taxa de serviço (não reembolsável)
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
            </View>
          )}
        </>
      )}

      {label('ONDE?')}
      <TextInput
        style={inputStyle}
        placeholder="Endereço ou bairro do serviço"
        placeholderTextColor={theme.textSecondary}
        value={address}
        onChangeText={setAddress}
      />

      <Text style={[styles.label, { color: theme.textSecondary }]}>
        PRÉVIA — é assim que os trabalhadores vão ver:
      </Text>
      <GigCard
        gig={previewGig}
        categoryName={categories.data?.find((item) => item.id === categoryId)?.name}
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
  publishLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
