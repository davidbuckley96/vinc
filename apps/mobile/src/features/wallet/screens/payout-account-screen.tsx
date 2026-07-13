import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { isValidCpf, validatePixKey, type PixKeyType } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { usePayoutAccount, useSavePayoutAccount } from '../hooks';

const KEY_TYPES: { type: PixKeyType; label: string; placeholder: string }[] = [
  { type: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { type: 'phone', label: 'Celular', placeholder: '(81) 99999-0000' },
  { type: 'email', label: 'E-mail', placeholder: 'voce@email.com' },
  { type: 'random', label: 'Aleatória', placeholder: 'chave gerada pelo seu banco' },
];

/**
 * Receiver onboarding (Fase 3.3 — D-035): Pix key + holder CPF, saved
 * before the first real payout. The withdraw gate points here.
 */
export function PayoutAccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const account = usePayoutAccount();
  const save = useSavePayoutAccount();

  const [keyType, setKeyType] = useState<PixKeyType>('cpf');
  const [key, setKey] = useState('');
  const [cpf, setCpf] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  // Prefill when an account already exists.
  useEffect(() => {
    if (!account.data) return;
    setKeyType(account.data.pixKeyType);
    setKey(account.data.pixKey);
    setCpf(account.data.holderCpf);
  }, [account.data]);

  const submit = async () => {
    setFeedback(null);
    const validation = validatePixKey(keyType, keyType === 'cpf' && !key.trim() ? cpf : key);
    if (!validation.ok) {
      setFeedback({
        kind: 'error',
        text:
          validation.error === 'key_required'
            ? 'Digite a sua chave Pix.'
            : 'Essa chave Pix não parece válida. Confira e tente de novo.',
      });
      return;
    }
    if (!isValidCpf(cpf)) {
      setFeedback({ kind: 'error', text: 'CPF inválido. Confira os números.' });
      return;
    }
    try {
      const result = await save.mutateAsync({
        pixKeyType: keyType,
        pixKey: validation.normalized!,
        holderCpf: cpf.replace(/\D/g, ''),
      });
      if (result === 'cpf_taken') {
        setFeedback({ kind: 'error', text: 'Este CPF já está em uso em outra conta.' });
        return;
      }
      if (result === 'cpf_banned') {
        setFeedback({ kind: 'error', text: 'Este CPF não pode ser usado no Vinc.' });
        return;
      }
      setFeedback({
        kind: 'success',
        text: 'Chave Pix salva! Seus saques vão para ela.',
      });
      setTimeout(() => router.back(), 1400);
    } catch {
      setFeedback({ kind: 'error', text: 'Não foi possível salvar agora. Tente de novo.' });
    }
  };

  const active = KEY_TYPES.find((item) => item.type === keyType)!;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                Receber pagamentos
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={[styles.info, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="key" size={18} color={theme.primarySoftText} />
            <Text style={[styles.infoText, { color: theme.primarySoftMeta }]}>
              Cadastre a{' '}
              <Text style={{ fontWeight: '800', color: theme.primarySoftText }}>chave Pix</Text>{' '}
              que vai receber os seus saques. A chave precisa ser sua (mesmo CPF do titular).
            </Text>
          </View>

          {account.isLoading && <ActivityIndicator color={theme.primary} />}

          <Text style={[styles.label, { color: theme.textSecondary }]}>TIPO DA CHAVE</Text>
          <View style={styles.chips}>
            {KEY_TYPES.map((item) => {
              const selected = keyType === item.type;
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  onPress={() => {
                    setKeyType(item.type);
                    setKey('');
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.primary : theme.background,
                      borderColor: selected ? theme.primary : theme.line,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: selected ? theme.onPrimary : theme.textSecondary },
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {keyType !== 'cpf' && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>SUA CHAVE PIX</Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
                ]}
                placeholder={active.placeholder}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType={keyType === 'phone' ? 'phone-pad' : 'default'}
                value={key}
                onChangeText={setKey}
              />
            </>
          )}

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            CPF DO TITULAR DA CHAVE
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
            ]}
            placeholder="000.000.000-00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            value={cpf}
            onChangeText={setCpf}
          />
          {keyType === 'cpf' && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Sua chave Pix é o próprio CPF acima.
            </Text>
          )}

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
            disabled={save.isPending}
            onPress={submit}
            style={[
              styles.cta,
              { backgroundColor: theme.primary, opacity: save.isPending ? 0.7 : 1 },
            ]}>
            {save.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.ctaLabel, { color: theme.onPrimary }]}>
                {account.data ? 'Atualizar chave Pix' : 'Salvar chave Pix'}
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
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
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  info: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    borderRadius: Radius.large,
    padding: Spacing.two + 3,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    fontSize: 14.5,
  },
  hint: {
    fontSize: 11.5,
    marginTop: -4,
  },
  feedback: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
