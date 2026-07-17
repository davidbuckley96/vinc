import { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MIN_KM = 10;
const MAX_KM = 100;
const STEP_KM = 5;
const THUMB = 24;

interface Props {
  value: number;
  onChange: (km: number) => void;
}

/**
 * Distance slider (H-03): 10–100 km, snapping to 5 km. Built with PanResponder
 * so it works the same on iOS, Android and react-native-web (there is no slider
 * dependency in the project). The track carries the gesture; the thumb is just
 * a visual marker positioned by percentage.
 */
export function RadiusSlider({ value, onChange }: Props) {
  const theme = useTheme();
  const widthRef = useRef(0);

  const clamp = (km: number) =>
    Math.min(MAX_KM, Math.max(MIN_KM, Math.round(km / STEP_KM) * STEP_KM));
  const pct = (Math.min(MAX_KM, Math.max(MIN_KM, value)) - MIN_KM) / (MAX_KM - MIN_KM);

  const setFromX = (x: number) => {
    const w = widthRef.current || 1;
    const ratio = Math.min(1, Math.max(0, x / w));
    const next = clamp(MIN_KM + ratio * (MAX_KM - MIN_KM));
    if (next !== value) onChange(next);
  };

  // Recriado a cada render para capturar `value`/`onChange` atuais (setFromX
  // fecha sobre eles); PanResponder.create é só uma fábrica de handlers.
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
    onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
  });

  return (
    <View>
      <Text style={[styles.value, { color: theme.text }]}>Até {value} km de você</Text>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={`Distância: até ${value} quilômetros`}
        accessibilityValue={{ min: MIN_KM, max: MAX_KM, now: value }}
        style={styles.hit}
        onLayout={(e: LayoutChangeEvent) => {
          widthRef.current = e.nativeEvent.layout.width;
        }}
        {...pan.panHandlers}>
        <View style={[styles.track, { backgroundColor: theme.line }]} />
        <View style={[styles.fill, { backgroundColor: theme.primary, width: `${pct * 100}%` }]} />
        <View
          style={[
            styles.thumb,
            { backgroundColor: theme.primary, borderColor: theme.background, left: `${pct * 100}%` },
          ]}
        />
      </View>
      <View style={styles.ends}>
        <Text style={[styles.end, { color: theme.textSecondary }]}>10 km</Text>
        <Text style={[styles.end, { color: theme.textSecondary }]}>100 km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  hit: {
    height: THUMB,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: Radius.pill,
  },
  fill: {
    position: 'absolute',
    height: 5,
    borderRadius: Radius.pill,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    marginLeft: -THUMB / 2,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  end: {
    fontSize: 11,
    fontWeight: '700',
  },
});
