import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { isValidCpf, validatePixKey, type PixKeyType } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * CPF + Pix key capture at account creation (D-038): the CPF field with
 * a checked-by-default "use my CPF as the Pix key" box; unchecking it
 * reveals the key type + key field. Shared by the sign-up form and the
 * mandatory completion screen (Google / first sign-in without a key).
 */

const OTHER_KEY_TYPES: { type: PixKeyType; label: string; placeholder: string }[] = [
  { type: 'phone', label: 'Celular', placeholder: '(81) 99999-0000' },
  { type: 'email', label: 'E-mail', placeholder: 'voce@email.com' },
  { type: 'random', label: 'Aleatória', placeholder: 'chave gerada pelo seu banco' },
];

export interface PixKeyPayload {
  pixKeyType: PixKeyType;
  pixKey: string;
  holderCpf: string;
}

export function usePixKeyState() {
  const [cpf, setCpf] = useState('');
  const [useCpfAsKey, setUseCpfAsKey] = useState(true);
  const [keyType, setKeyType] = useState<PixKeyType>('phone');
  const [pixKey, setPixKey] = useState('');

  /** pt-BR error, or the normalized payload to save. */
  const validate = (): { payload?: PixKeyPayload; error?: string } => {
    if (!isValidCpf(cpf)) return { error: 'CPF inválido. Confira os números.' };
    const holderCpf = cpf.replace(/\D/g, '');
    if (useCpfAsKey) return { payload: { pixKeyType: 'cpf', pixKey: holderCpf, holderCpf } };
    const validation = validatePixKey(keyType, pixKey);
    if (!validation.ok) {
      return {
        error:
          validation.error === 'key_required'
            ? 'Digite a sua chave Pix.'
            : 'Essa chave Pix não parece válida. Confira e tente de novo.',
      };
    }
    return { payload: { pixKeyType: keyType, pixKey: validation.normalized!, holderCpf } };
  };

  return { cpf, setCpf, useCpfAsKey, setUseCpfAsKey, keyType, setKeyType, pixKey, setPixKey, validate };
}

export function PixKeySection({ state }: { state: ReturnType<typeof usePixKeyState> }) {
  const theme = useTheme();
  const active = OTHER_KEY_TYPES.find((item) => item.type === state.keyType);

  return (
    <View style={styles.section}>
      <TextInput
        style={[
          styles.input,
          { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
        ]}
        placeholder="Seu CPF (000.000.000-00)"
        placeholderTextColor={theme.textSecondary}
        keyboardType="numeric"
        value={state.cpf}
        onChangeText={state.setCpf}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.useCpfAsKey }}
        onPress={() => state.setUseCpfAsKey(!state.useCpfAsKey)}
        style={styles.checkRow}>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: state.useCpfAsKey ? theme.primary : theme.background,
              borderColor: state.useCpfAsKey ? theme.primary : theme.line,
            },
          ]}>
          {state.useCpfAsKey && <Ionicons name="checkmark" size={13} color={theme.onPrimary} />}
        </View>
        <Text style={[styles.checkLabel, { color: theme.text }]}>
          Usar meu CPF como <Text style={{ fontWeight: '700' }}>chave Pix</Text> (é onde você
          recebe pelo app)
        </Text>
      </Pressable>

      {!state.useCpfAsKey && (
        <>
          <View style={styles.chips}>
            {OTHER_KEY_TYPES.map((item) => {
              const selected = state.keyType === item.type;
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  onPress={() => {
                    state.setKeyType(item.type);
                    state.setPixKey('');
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
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
            ]}
            placeholder={`Sua chave Pix — ${active?.placeholder ?? ''}`}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType={state.keyType === 'phone' ? 'phone-pad' : 'default'}
            value={state.pixKey}
            onChangeText={state.setPixKey}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            A chave precisa estar registrada no seu banco e ser sua (mesmo CPF).
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + 4,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.large - 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    fontSize: 15,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18.5,
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
  hint: {
    fontSize: 11.5,
    marginTop: -Spacing.one,
  },
});
