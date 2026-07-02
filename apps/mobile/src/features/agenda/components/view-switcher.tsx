import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AgendaView = 'day' | 'week' | 'month';

const OPTIONS: { key: AgendaView; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
];

interface Props {
  value: AgendaView;
  onChange: (view: AgendaView) => void;
}

/** Segmented Dia/Semana/Mês control rendered on the purple header. */
export function ViewSwitcher({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.track}>
      {OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={[styles.option, selected && { backgroundColor: theme.background }]}>
            <Text
              style={[
                styles.label,
                { color: selected ? theme.primary : theme.onPrimaryMuted },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.medium,
    padding: 3,
    marginHorizontal: Spacing.three,
  },
  option: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.small + 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
