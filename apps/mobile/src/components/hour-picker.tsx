import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  title: string;
  value: number;
  /** Selectable hours (0–23). Callers pre-filter past hours. */
  hours: number[];
  onSelect: (hour: number) => void;
  onClose: () => void;
}

// h ≥ 24 = madrugada do dia seguinte (serviço que vira o dia — D-058).
const pad = (h: number) =>
  h >= 24 ? `${String(h - 24).padStart(2, '0')}:00 (dia seguinte)` : `${String(h).padStart(2, '0')}:00`;

/**
 * Scrollable 24h hour picker (D-053) — replaces the fixed 6h–23h slider so
 * gigs can happen at any hour, madrugada included. Past hours for today are
 * filtered out by the caller; the list opens centered near the current value.
 */
export function HourPicker({ visible, title, value, hours, onSelect, onClose }: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle}>
              <View style={[styles.grabber, { backgroundColor: theme.line }]} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            {hours.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                Não há horários disponíveis neste dia. Escolha outro dia.
              </Text>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {hours.map((h) => {
                  const active = h === value;
                  return (
                    <Pressable
                      key={h}
                      accessibilityRole="button"
                      onPress={() => {
                        onSelect(h);
                        onClose();
                      }}
                      style={[
                        styles.row,
                        { borderColor: theme.line },
                        active && { backgroundColor: theme.primarySoft, borderColor: theme.primary },
                      ]}>
                      <Text
                        style={[
                          styles.rowLabel,
                          { color: active ? theme.primarySoftText : theme.text },
                          active && { fontWeight: '800' },
                        ]}>
                        {pad(h)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
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
  title: { fontSize: 17, fontWeight: '800', marginBottom: Spacing.two },
  empty: { fontSize: 13.5, lineHeight: 19, paddingVertical: Spacing.three },
  list: { maxHeight: 320 },
  listContent: { gap: Spacing.one + 2, paddingBottom: Spacing.two },
  row: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 13,
    alignItems: 'center',
  },
  rowLabel: { fontSize: 16, fontWeight: '600' },
});
