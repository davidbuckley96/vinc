import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import { reverseGeocode, searchAddress, type GeoResult } from '@/lib/geocoding';

import { BRAZIL_CENTER } from './config';
import { LocationMap } from './location-map';

export interface PickedLocation {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  visible: boolean;
  /** Re-opening to adjust an already chosen spot. */
  initial?: PickedLocation | null;
  onConfirm: (location: PickedLocation) => void;
  onClose: () => void;
}

/**
 * Fullscreen map picker — round 7, option A (D-023): fixed pin in the
 * center, the MAP moves underneath (Uber style); search on top, live
 * address at the bottom, one confirm button.
 */
export function LocationPicker({ visible, initial, onConfirm, onClose }: LocationPickerProps) {
  const theme = useTheme();

  const start = initial ?? null;
  const [center, setCenter] = useState({
    lat: start?.lat ?? BRAZIL_CENTER.lat,
    lng: start?.lng ?? BRAZIL_CENTER.lng,
    zoom: start ? 16 : BRAZIL_CENTER.zoom,
  });
  // Confirming only makes sense after the person placed the pin somewhere.
  const [interacted, setInteracted] = useState(Boolean(start));
  const [label, setLabel] = useState<string | null>(start?.address ?? null);
  const [reading, setReading] = useState(false);
  // The point must resolve to an address inside Brazil (D-023). Starts true
  // for an already-chosen spot; a fresh pin is validated on the first move.
  const [inBrazil, setInBrazil] = useState(Boolean(start));

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
  }, []);

  const moved = (lat: number, lng: number) => {
    setCenter((current) => ({ ...current, lat, lng }));
    setInteracted(true);
    setReading(true);
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      const found = await reverseGeocode(lat, lng);
      setLabel(found?.label ?? 'Ponto fora de uma área com endereço');
      setInBrazil(found?.inBrazil ?? false);
      setReading(false);
    }, 700);
  };

  // Search AS the person types (debounced) — no need to press "buscar".
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      setResults(await searchAddress(q));
      setSearching(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  const pickResult = (result: GeoResult) => {
    setResults([]);
    setQuery('');
    setCenter({ lat: result.lat, lng: result.lng, zoom: 16 });
    setLabel(result.label);
    setInteracted(true);
    setInBrazil(true); // search is scoped to Brazil (countrycodes=br)
  };

  const canConfirm = interacted && inBrazil && !reading;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm({ address: label ?? 'Ponto marcado no mapa', lat: center.lat, lng: center.lng });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.column}>
          <View style={[styles.header, { backgroundColor: theme.primary }]}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar o mapa"
                  onPress={onClose}
                  hitSlop={12}>
                  <Ionicons name="close" size={24} color={theme.onPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  Onde será o serviço?
                </Text>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.mapArea}>
            <LocationMap
              lat={center.lat}
              lng={center.lng}
              zoom={center.zoom}
              interactive
              onCenterChange={moved}
              style={StyleSheet.absoluteFill}
            />

            {/* fixed center pin — the map moves underneath (option A) */}
            <View pointerEvents="none" style={styles.pinWrap}>
              <Ionicons
                name="location-sharp"
                size={44}
                color={theme.primary}
                style={styles.pin}
              />
            </View>

            <View style={styles.searchWrap}>
              <View style={[styles.searchBar, { backgroundColor: theme.background }]}>
                <Ionicons name="search" size={16} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Buscar endereço ou bairro…"
                  placeholderTextColor={theme.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
                {searching && <ActivityIndicator size="small" color={theme.primary} />}
              </View>
              {results.length > 0 && (
                <View style={[styles.results, { backgroundColor: theme.background }]}>
                  {results.map((result, index) => (
                    <Pressable
                      key={`${result.lat}-${result.lng}-${index}`}
                      accessibilityRole="button"
                      onPress={() => pickResult(result)}
                      style={[styles.result, { borderBottomColor: theme.line }]}>
                      <Ionicons name="location-outline" size={15} color={theme.primary} />
                      <Text style={[styles.resultLabel, { color: theme.text }]} numberOfLines={2}>
                        {result.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.confirmBar, { backgroundColor: theme.background }]}>
              <Text
                style={[
                  styles.address,
                  { color: interacted && !inBrazil && !reading ? theme.danger : theme.text },
                ]}
                numberOfLines={2}>
                {reading
                  ? 'Lendo o endereço…'
                  : interacted && !inBrazil
                    ? 'Escolha um local dentro do Brasil.'
                    : (label ?? 'Busque um endereço ou arraste o mapa até o local')}
              </Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                arraste o mapa para ajustar o pino
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={!canConfirm}
                onPress={confirm}
                style={[
                  styles.confirm,
                  { backgroundColor: canConfirm ? theme.primary : theme.backgroundSelected },
                ]}>
                <Text
                  style={[
                    styles.confirmLabel,
                    { color: canConfirm ? theme.onPrimary : theme.textSecondary },
                  ]}>
                  Confirmar este local
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
    zIndex: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  mapArea: {
    flex: 1,
  },
  pinWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pin: {
    // tip of the pin points at the exact center
    transform: [{ translateY: -22 }],
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  searchWrap: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    right: Spacing.two,
    zIndex: 4,
    gap: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 9,
  },
  results: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    padding: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  resultLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: 3,
    zIndex: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  address: {
    fontSize: 14,
    fontWeight: '800',
  },
  hint: {
    fontSize: 11.5,
  },
  confirm: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
});
