import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import type { OpenGig } from '@vinc/api';
import { formatBRL, validateGigDraft, type GigDraft, type GigDraftError } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { GigCard } from '../components/gig-card';
import { useCategories, useCreateGig } from '../hooks';

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

/**
 * Post screen — compact form with a live preview of the listing exactly as
 * workers will see it (D-007).
 */
export function PostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status, session, userName } = useSession();
  const categories = useCategories();
  const createGig = useCreateGig(session?.user.id ?? null);

  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
      }),
    [],
  );

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayIndex, setDayIndex] = useState(1);
  const [startHour, setStartHour] = useState(14);
  const [endHour, setEndHour] = useState(17);
  const [priceCents, setPriceCents] = useState(0);
  const [address, setAddress] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  const selectedDay = days[dayIndex] ?? days[0]!;
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
    title: title.trim() || 'Título do serviço',
    description,
    startsAt: draft.startsAt,
    endsAt: draft.endsAt,
    priceCents,
    address: address.trim() || 'Local',
    categoryId,
    posterName: userName ?? 'Você',
  };

  const publish = async () => {
    setFeedback(null);
    if (status === 'signedOut') {
      router.push('/auth');
      return;
    }
    const errors = validateGigDraft(draft, new Date());
    const firstError = errors[0];
    if (firstError) {
      setFeedback({ kind: 'error', text: ERROR_MESSAGES[firstError] });
      return;
    }
    try {
      await createGig.mutateAsync(draft);
      setFeedback({
        kind: 'success',
        text:
          status === 'unconfigured'
            ? 'Modo demonstração: a vaga seria publicada agora.'
            : 'Vaga publicada! Ela já aparece na busca.',
      });
      setTitle('');
      setDescription('');
      setPriceCents(0);
      setAddress('');
    } catch {
      setFeedback({
        kind: 'error',
        text: 'Não foi possível publicar. Verifique sua conexão e tente de novo.',
      });
    }
  };

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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Anunciar vaga</Text>
          </SafeAreaView>
        </View>

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

          {label('QUANTO VAI PAGAR?')}
          <TextInput
            style={inputStyle}
            placeholder="R$ 0,00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            value={priceCents ? formatBRL(priceCents) : ''}
            onChangeText={(text) => setPriceCents(Number(text.replace(/\D/g, '')))}
          />

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

          {feedback && (
            <Text
              style={[
                styles.feedback,
                { color: feedback.kind === 'error' ? theme.danger : theme.success },
              ]}>
              {feedback.text}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={createGig.isPending}
            onPress={publish}
            style={[
              styles.publish,
              { backgroundColor: theme.primary, opacity: createGig.isPending ? 0.7 : 1 },
            ]}>
            {createGig.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.publishLabel, { color: theme.onPrimary }]}>
                Publicar vaga
              </Text>
            )}
          </Pressable>
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
