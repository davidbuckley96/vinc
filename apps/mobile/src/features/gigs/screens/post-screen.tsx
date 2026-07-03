import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computeGigPricing, formatBRL, type GigDraft } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

import { GigForm, type GigFormFeedback } from '../components/gig-form';
import { useCreateGig } from '../hooks';

/**
 * Post screen — creates a gig with the shared GigForm (live preview, fee
 * box with the upfront total — D-007/D-014).
 */
export function PostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { status } = useSession();
  const createGig = useCreateGig();

  const [feedback, setFeedback] = useState<GigFormFeedback | null>(null);
  // Remounts the form (clearing every field) after a successful publish.
  const [formKey, setFormKey] = useState(0);

  const publish = async (draft: GigDraft) => {
    setFeedback(null);
    if (status === 'signedOut') {
      router.push('/auth');
      return;
    }
    try {
      const result = await createGig.mutateAsync(draft);
      if (result !== 'created') {
        setFeedback({
          kind: 'error',
          text:
            result === 'unauthorized'
              ? 'Entre na sua conta para anunciar.'
              : 'Não foi possível publicar. Verifique os dados e tente de novo.',
        });
        return;
      }
      const pricing = computeGigPricing(draft.priceCents);
      setFeedback({
        kind: 'success',
        text:
          status === 'unconfigured'
            ? 'Modo demonstração: a vaga seria publicada agora.'
            : `Vaga publicada! ${formatBRL(pricing.totalCents)} saíram da sua carteira (${formatBRL(pricing.netCents)} reservados para o prestador).`,
      });
      setFormKey((key) => key + 1);
    } catch {
      setFeedback({
        kind: 'error',
        text: 'Não foi possível publicar. Verifique sua conexão e tente de novo.',
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Anunciar vaga</Text>
          </SafeAreaView>
        </View>

        <GigForm
          key={formKey}
          submitLabel="Publicar vaga"
          pending={createGig.isPending}
          feedback={feedback}
          onSubmit={publish}
        />
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
});
