import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ReportReason {
  /** Stored in reports.category. */
  key: string;
  label: string;
}

interface ReportSheetProps {
  visible: boolean;
  title: string;
  reasons: ReportReason[];
  pending?: boolean;
  /** Called with the chosen reason key + the optional free-text detail. */
  onSubmit: (category: string, detail: string) => void;
  onClose: () => void;
}

/**
 * Denúncia com motivos (D-052, pedido do David): o usuário escolhe um motivo
 * da lista e pode adicionar um texto complementar. Reusada para vagas e
 * avaliações. Fecha no envio via o pai (que troca por um estado "enviada").
 */
export function ReportSheet({
  visible,
  title,
  reasons,
  pending = false,
  onSubmit,
  onClose,
}: ReportSheetProps) {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState('');

  const close = () => {
    setSelected(null);
    setDetail('');
    onClose();
  };

  const submit = () => {
    if (!selected || pending) return;
    onSubmit(selected, detail.trim());
    setSelected(null);
    setDetail('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={close} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle}>
              <View style={[styles.grabber, { backgroundColor: theme.line }]} />
            </View>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Escolha o motivo. A equipe do Vinc analisa cada denúncia.
            </Text>

            {reasons.map((reason) => {
              const active = selected === reason.key;
              return (
                <Pressable
                  key={reason.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected(reason.key)}
                  style={[
                    styles.reason,
                    { borderColor: active ? theme.primary : theme.line },
                    active && { backgroundColor: theme.primarySoft },
                  ]}>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={19}
                    color={active ? theme.primary : theme.textSecondary}
                  />
                  <Text style={[styles.reasonLabel, { color: theme.text }]}>{reason.label}</Text>
                </Pressable>
              );
            })}

            <TextInput
              style={[
                styles.detail,
                { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
              ]}
              placeholder="Quer explicar melhor? (opcional)"
              placeholderTextColor={theme.textSecondary}
              value={detail}
              onChangeText={setDetail}
              multiline
              maxLength={1000}
            />

            <Pressable
              accessibilityRole="button"
              disabled={!selected || pending}
              onPress={submit}
              style={[
                styles.submit,
                { backgroundColor: selected ? theme.danger : theme.backgroundSelected },
              ]}>
              {pending ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text
                  style={[
                    styles.submitLabel,
                    { color: selected ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Enviar denúncia
                </Text>
              )}
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropTap: StyleSheet.absoluteFill,
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  handle: { alignItems: 'center', paddingVertical: Spacing.two },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: Spacing.two },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 12,
    marginBottom: Spacing.one + 2,
  },
  reasonLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  detail: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
    marginTop: Spacing.one,
  },
  submit: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitLabel: { fontSize: 15, fontWeight: '800' },
});
