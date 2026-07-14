import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { UpdateGigResult } from '@vinc/api';
import type { GigDraft } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { GigForm, type GigFormFeedback } from '../components/gig-form';
import { useGig, useUpdateGig } from '../hooks';

const ERROR_MESSAGES: Partial<Record<UpdateGigResult, string>> = {
  not_editable: 'Esta vaga não pode mais ser editada.',
  has_candidates:
    'Já há gente candidatada — não dá para mudar horário ou local agora. Para alterar, recuse os candidatos atuais ou exclua a vaga e crie outra.',
  forbidden: 'Esta vaga não é sua.',
  not_found: 'Esta vaga não existe mais.',
  unauthorized: 'Entre na sua conta para continuar.',
  state_changed: 'O status mudou agora mesmo. Atualize e tente de novo.',
  network_error: 'Sem conexão. Verifique sua internet e tente de novo.',
};

/**
 * Edit screen for an own OPEN gig — same form as posting, but the price is
 * locked to what was paid at creation (D-017).
 */
export function EditGigScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gig = useGig(id);
  const updateGig = useUpdateGig();

  const [feedback, setFeedback] = useState<GigFormFeedback | null>(null);

  const save = async (draft: GigDraft) => {
    setFeedback(null);
    try {
      const result = await updateGig.mutateAsync({ gigId: id, draft });
      if (result !== 'updated') {
        setFeedback({
          kind: 'error',
          text: ERROR_MESSAGES[result] ?? 'Não foi possível salvar. Tente de novo.',
        });
        return;
      }
      setFeedback({ kind: 'success', text: 'Vaga atualizada!' });
      setTimeout(() => router.back(), 1000);
    } catch {
      setFeedback({ kind: 'error', text: 'Não foi possível salvar. Tente de novo.' });
    }
  };

  // The form edits the EXACT location — the poster always reads it (RLS).
  const initial: GigDraft | null = gig.data
    ? {
        categoryId: gig.data.categoryId,
        title: gig.data.title,
        description: gig.data.description,
        startsAt: gig.data.startsAt,
        endsAt: gig.data.endsAt,
        priceCents: gig.data.priceCents,
        address: gig.data.exactAddress ?? gig.data.area,
        lat: gig.data.exactLat,
        lng: gig.data.exactLng,
      }
    : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => router.back()}
                hitSlop={12}>
                <Ionicons name="chevron-back" size={24} color={theme.onPrimary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Editar vaga</Text>
            </View>
          </SafeAreaView>
        </View>

        {gig.isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
        {!gig.isLoading && !initial && (
          <View style={styles.center}>
            <Text style={[styles.missing, { color: theme.textSecondary }]}>
              Esta vaga não existe mais.
            </Text>
          </View>
        )}
        {initial && (
          <GigForm
            initial={initial}
            priceLocked
            submitLabel="Salvar alterações"
            pending={updateGig.isPending}
            feedback={feedback}
            onSubmit={save}
          />
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  missing: {
    fontSize: 14.5,
    textAlign: 'center',
  },
});
