import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../auth-actions';
import { useSession } from '../session-context';

type Mode = 'signIn' | 'signUp';

/**
 * Single-screen sign in / sign up with Google option — design round 2,
 * decision D-006 (option A + Google).
 */
export function AuthScreen() {
  const theme = useTheme();
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (status === 'signedIn') {
    return <Redirect href="/" />;
  }

  const signUp = mode === 'signUp';

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (signUp && name.trim().length < 2) {
      setError('Digite seu nome.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setBusy(true);
    const result = signUp
      ? await signUpWithEmail(name.trim(), email.trim(), password)
      : await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Algo deu errado. Tente de novo.');
    } else if (signUp) {
      setNotice('Conta criada! Se pedirmos confirmação, veja seu e-mail.');
    }
  };

  const google = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    if (!result.ok) setError(result.error ?? 'Algo deu errado. Tente de novo.');
  };

  const switchMode = () => {
    setMode(signUp ? 'signIn' : 'signUp');
    setError(null);
    setNotice(null);
  };

  const inputStyle = [
    styles.input,
    { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
  ];

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
            <Text style={[styles.title, { color: theme.text }]}>
              {signUp ? 'Criar sua conta' : 'Bem-vindo ao Vinc'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Trabalhos por horário, pagamento garantido pelo app.
            </Text>

            {status === 'unconfigured' && (
              <View style={[styles.banner, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.bannerText, { color: theme.primarySoftText }]}>
                  Modo demonstração: o servidor ainda não foi conectado.
                </Text>
              </View>
            )}

            {signUp && (
              <TextInput
                style={inputStyle}
                placeholder="Seu nome"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                autoComplete="name"
                value={name}
                onChangeText={setName}
              />
            )}
            <TextInput
              style={inputStyle}
              placeholder="E-mail"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={inputStyle}
              placeholder="Senha"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoComplete={signUp ? 'new-password' : 'current-password'}
              value={password}
              onChangeText={setPassword}
            />

            {error && <Text style={[styles.feedback, { color: theme.danger }]}>{error}</Text>}
            {notice && <Text style={[styles.feedback, { color: theme.success }]}>{notice}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={submit}
              style={[styles.button, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}>
              {busy ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>
                  {signUp ? 'Criar conta grátis' : 'Entrar'}
                </Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
              <Text style={[styles.dividerLabel, { color: theme.textSecondary }]}>ou</Text>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={google}
              style={[styles.button, styles.buttonOutline, { borderColor: theme.line }]}>
              <Text style={[styles.googleG]}>G</Text>
              <Text style={[styles.buttonLabel, { color: theme.text }]}>
                {signUp ? 'Cadastrar com Google' : 'Entrar com Google'}
              </Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switchMode}>
              <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>
                {signUp ? 'Já tem conta? ' : 'Ainda não tem conta? '}
                <Text style={{ color: theme.primary, fontWeight: '700' }}>
                  {signUp ? 'Entrar' : 'Criar conta grátis'}
                </Text>
              </Text>
            </Pressable>
          </ScrollView>
          <Text style={[styles.terms, { color: theme.textSecondary }]}>
            Ao continuar, você concorda com os Termos de Uso.
          </Text>
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
  banner: {
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
  },
  bannerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.large - 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    fontSize: 15,
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
    flexDirection: 'row',
    gap: Spacing.two,
  },
  buttonOutline: {
    borderWidth: 1.5,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  googleG: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4285F4',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 12,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  switchLabel: {
    fontSize: 13.5,
  },
  terms: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
});
