import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSavePayoutAccount } from '@/features/wallet/hooks';
import { useTheme } from '@/hooks/use-theme';

import { signOut } from '../auth-actions';
import { PixKeySection, usePixKeyState } from '../components/pix-key-section';

/**
 * Mandatory completion step (D-038) for accounts created without the
 * receiving key — Google sign-in, or e-mail sign-up finished before the
 * key could be saved. The PayoutOnboardingGate routes here.
 */
export function CompleteSignupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const pixKey = usePixKeyState();
  const save = useSavePayoutAccount();
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const validation = pixKey.validate();
    if (!validation.payload) {
      setError(validation.error ?? 'Confira seu CPF e sua chave Pix.');
      return;
    }
    try {
      await save.mutateAsync(validation.payload);
      router.replace('/');
    } catch {
      setError('Não foi possível salvar agora. Tente de novo.');
    }
  };

  const leave = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.logo, { backgroundColor: theme.primary }]}>
              <Text style={[styles.logoLabel, { color: theme.onPrimary }]}>V</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Falta só uma coisa</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Diga para onde vão os seus pagamentos. Dá para trocar quando quiser, no seu perfil.
            </Text>

            <PixKeySection state={pixKey} />

            {error && <Text style={[styles.feedback, { color: theme.danger }]}>{error}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={save.isPending}
              onPress={submit}
              style={[
                styles.button,
                { backgroundColor: theme.primary, opacity: save.isPending ? 0.7 : 1 },
              ]}>
              {save.isPending ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>
                  Salvar e começar
                </Text>
              )}
            </Pressable>

            <Pressable accessibilityRole="button" onPress={leave} style={styles.leave}>
              <Text style={[styles.leaveLabel, { color: theme.textSecondary }]}>
                Sair da conta
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.two + 4,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: Radius.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    fontSize: 26,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  feedback: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  leave: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  leaveLabel: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
