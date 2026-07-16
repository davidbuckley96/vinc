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

import { insideBrazilBbox } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { locateDevice } from '@/features/gigs/region';
import { useTheme } from '@/hooks/use-theme';
import { reverseGeocodeDetailed, searchAddress, type GeoResult } from '@/lib/geocoding';

import { BRAZIL_CENTER } from './config';
import { LocationMap } from './location-map';

export interface PickedLocation {
  address: string;
  lat: number;
  lng: number;
  /**
   * Public neighbourhood label from the structured geocoder parts (A2,
   * docs/13). Carried so create-gig gets the real bairro without re-parsing
   * `address`; may be empty when the provider gives no area.
   */
  area?: string;
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
  // Structured neighbourhood label for the confirmed point (A2, docs/13).
  const [area, setArea] = useState<string>(start?.area ?? '');
  const [reading, setReading] = useState(false);
  // What the reverse lookup said about the pin (D-059): 'ocean'/'foreign'
  // block the confirm; 'error' (network) falls back to the offline bbox so a
  // valid pin is never wrongly blocked.
  type PointStatus = 'unknown' | 'brazil' | 'foreign' | 'ocean' | 'error';
  const [pointStatus, setPointStatus] = useState<PointStatus>(start ? 'brazil' : 'unknown');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const located = useRef(false);
  const wasVisible = useRef(false);

  useEffect(() => () => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
  }, []);

  // G-09 (docs/16): a picker é um Modal sempre montado, então o estado interno
  // sobrevivia entre aberturas — arrastar o mapa e fechar no X deixava o ponto
  // "grudado", reaparecendo como se tivesse sido confirmado. Ao ABRIR, resemeia
  // tudo a partir do `initial` (o valor de fato confirmado): assim cancelar
  // descarta o rascunho e reabrir mostra só o que já estava salvo.
  useEffect(() => {
    if (visible && !wasVisible.current) {
      const seed = initial ?? null;
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
      setCenter({
        lat: seed?.lat ?? BRAZIL_CENTER.lat,
        lng: seed?.lng ?? BRAZIL_CENTER.lng,
        zoom: seed ? 16 : BRAZIL_CENTER.zoom,
      });
      setInteracted(Boolean(seed));
      setLabel(seed?.address ?? null);
      setArea(seed?.area ?? '');
      setPointStatus(seed ? 'brazil' : 'unknown');
      setReading(false);
      setQuery('');
      setResults([]);
      setNoResults(false);
      located.current = false; // let the GPS re-locate when opening without a pin
    }
    wasVisible.current = visible;
    // `initial` is read fresh at open time; re-running on its identity would
    // wipe an in-progress drag, so we key only on `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Open the map on the user's own region (B-10) instead of the middle of
  // Brazil: try the device GPS once when the picker opens without a pin.
  // Só usa o GPS se ele estiver DENTRO do Brasil — quem está no exterior (ex.:
  // testando de Portugal) não quer o mapa abrindo lá fora, já que as vagas são
  // sempre no Brasil.
  useEffect(() => {
    if (!visible || start || located.current) return;
    located.current = true;
    locateDevice().then((result) => {
      if (result.ok && insideBrazilBbox(result.lat, result.lng)) {
        setCenter({ lat: result.lat, lng: result.lng, zoom: 15 });
      }
    });
  }, [visible, start]);

  const inBbox = insideBrazilBbox(center.lat, center.lng);

  const runReverse = (lat: number, lng: number) => {
    setReading(true);
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      const outcome = await reverseGeocodeDetailed(lat, lng);
      if (outcome.kind === 'address') {
        setLabel(outcome.label);
        setArea(outcome.area);
        setPointStatus(outcome.inBrazil ? 'brazil' : 'foreign');
      } else if (outcome.kind === 'no_address') {
        setLabel(null);
        setPointStatus('ocean');
      } else {
        setLabel('Ponto marcado no mapa');
        setPointStatus('error'); // network — bbox decides
      }
      setReading(false);
    }, 700);
  };

  const moved = (lat: number, lng: number) => {
    setCenter((current) => ({ ...current, lat, lng }));
    setInteracted(true);
    runReverse(lat, lng);
  };

  // Search the address as the person types (debounced) AND on submit.
  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (q.length < 3) {
      setResults([]);
      setNoResults(false);
      return;
    }
    setSearching(true);
    const found = await searchAddress(q);
    setResults(found);
    setNoResults(found.length === 0);
    setSearching(false);
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setNoResults(false);
      return;
    }
    const timer = setTimeout(() => runSearch(q), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const pickResult = (result: GeoResult) => {
    setResults([]);
    setNoResults(false);
    setQuery('');
    setCenter({ lat: result.lat, lng: result.lng, zoom: 16 });
    setLabel(result.label);
    setArea(result.area);
    setInteracted(true);
    setPointStatus('brazil'); // search is scoped to Brazil (countrycodes=br)
    setReading(false);
    // A search pick is a fresh point — cancel any pending reverse lookup for the
    // previously dragged center, or it would resolve later and clobber this pick.
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
  };

  // Ocean / foreign always block; a network error falls back to the bbox.
  const blocked = pointStatus === 'ocean' || pointStatus === 'foreign' || !inBbox;
  const canConfirm = interacted && !reading && !blocked;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm({
      address: label ?? 'Ponto marcado no mapa',
      lat: center.lat,
      lng: center.lng,
      area: area || undefined,
    });
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
                  onSubmitEditing={() => runSearch(query)}
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
              {noResults && !searching && (
                <View style={[styles.results, { backgroundColor: theme.background }]}>
                  <Text style={[styles.noResults, { color: theme.textSecondary }]}>
                    Nenhum endereço encontrado. Tente outro termo ou arraste o mapa.
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.confirmBar, { backgroundColor: theme.background }]}>
              <Text
                style={[
                  styles.address,
                  { color: interacted && blocked && !reading ? theme.danger : theme.text },
                ]}
                numberOfLines={2}>
                {reading
                  ? 'Lendo o endereço…'
                  : pointStatus === 'ocean'
                    ? 'Escolha um ponto em terra, com endereço (não o mar).'
                    : interacted && blocked
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
  noResults: {
    fontSize: 12.5,
    padding: Spacing.two + 2,
    lineHeight: 17,
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
