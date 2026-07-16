import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computeGigPricing, formatBRL, suspensionUntilLabel, type GigDraft } from '@vinc/core';

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
  const navigation = useNavigation();
  const { status } = useSession();
  const createGig = useCreateGig();

  const [feedback, setFeedback] = useState<GigFormFeedback | null>(null);
  // Remounts the form (clearing every field) after a successful publish.
  const [formKey, setFormKey] = useState(0);
  // Hit the open-gigs limit (B-21): show a link to manage them; the draft
  // stays intact (form isn't reset), so voltar do perfil não perde nada.
  const [limitHit, setLimitHit] = useState(false);

  // Tapping the "Anunciar" tab always opens a FRESH form (B-15): the old
  // state (a filled-in location, a previous success message) shouldn't come
  // back when returning to the tab from Carteira etc.
  useEffect(() => {
    const tabNav = navigation as unknown as {
      addListener: (event: 'tabPress', cb: () => void) => () => void;
    };
    const unsubscribe = tabNav.addListener('tabPress', () => {
      setFeedback(null);
      setLimitHit(false);
      setFormKey((key) => key + 1);
    });
    return unsubscribe;
  }, [navigation]);

  const publish = async (draft: GigDraft) => {
    setFeedback(null);
    setLimitHit(false);
    if (status === 'signedOut') {
      router.push('/auth');
      return;
    }
    try {
      const outcome = await createGig.mutateAsync(draft);
      if (outcome.code !== 'created') {
        if (outcome.code === 'too_many_open_gigs') setLimitHit(true);
        setFeedback({
          kind: 'error',
          text:
            outcome.code === 'unauthorized'
              ? 'Entre na sua conta para anunciar.'
              : outcome.code === 'contact_in_text'
                ? 'Não coloque telefone, e-mail, redes sociais ou links no anúncio — o contato acontece pelo app depois da escolha.'
                : outcome.code === 'prohibited_content'
                  ? 'Este anúncio tem conteúdo proibido e não pode ser publicado.'
                  : outcome.code === 'suspended'
                    ? `Sua conta está suspensa temporariamente${suspensionUntilLabel(outcome.until)}. Você poderá anunciar quando a suspensão terminar.`
                    : outcome.code === 'too_many_open_gigs'
                      ? `Você já tem ${outcome.limit ?? 3} vagas abertas. Exclua uma no seu perfil para anunciar outra — seu rascunho continua aqui.`
                      : 'Não foi possível publicar. Verifique os dados e tente de novo.',
        });
        return;
      }
      // Publicou → vai direto para a vaga recém-criada (B-14). Remonta o
      // formulário ANTES de navegar (G-01, docs/16): com `push` (não `replace`,
      // que apagava a pilha e travava o voltar), ao voltar a aba Anunciar já
      // aparece com o formulário LIMPO, sem os dados da vaga recém-criada.
      setFormKey((key) => key + 1);
      if (outcome.gigId) {
        router.push(`/gig/${outcome.gigId}`);
        return;
      }
      const pricing = computeGigPricing(draft.priceCents);
      setFeedback({
        kind: 'success',
        text:
          status === 'unconfigured'
            ? 'Modo demonstração: a vaga seria publicada agora.'
            : `Vaga publicada de graça! Você só paga os ${formatBRL(pricing.totalCents)} quando escolher um candidato.`,
      });
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

        {limitHit && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/profile')}
            style={[styles.limitLink, { backgroundColor: theme.dangerSoft }]}>
            <Text style={[styles.limitLinkText, { color: theme.danger }]}>
              Ver e excluir minhas vagas abertas ›
            </Text>
          </Pressable>
        )}

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
  limitLink: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
    paddingVertical: 11,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  limitLinkText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
