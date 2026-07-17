import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deriveAreaLabel, GENERIC_AREA_LABEL, insideBrazilBbox } from '@vinc/core';

import { LocationPicker } from '@/components/location-map';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchRegions, type GeoResult } from '@/lib/geocoding';

import {
  DEFAULT_RADIUS_KM,
  locateDevice,
  RADIUS_OPTIONS_KM,
  type Region,
} from '../region';

interface RegionModalProps {
  visible: boolean;
  region: Region | null;
  onChange: (region: Region | null) => void;
  onClose: () => void;
  /**
   * Show the radius chips (default true). The search screen sets this to false
   * (H-03): there the radius lives in the filter's distance slider, so this
   * modal only picks the LOCATION. Alerts keep the chips.
   */
  showRadius?: boolean;
}

/** Prefer the neighbourhood part; keep the full label when there is none. */
function regionLabel(full: string): string {
  const area = deriveAreaLabel(full);
  return area === GENERIC_AREA_LABEL ? full : area;
}

/**
 * Region picker (D-029): GPS suggestion + manual map adjustment +
 * adjustable radius (default 30 km). The location only filters the
 * search — it is never shown to other users.
 */
export function RegionModal({
  visible,
  region,
  onChange,
  onClose,
  showRadius = true,
}: RegionModalProps) {
  const theme = useTheme();
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Region name search biased by GPS (B-08). `near` biases suggestions to the
  // user's surroundings; fetched once on open, dynamic (no hard-coded lists).
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(
    region ? { lat: region.lat, lng: region.lng } : null,
  );

  const radiusKm = region?.radiusKm ?? DEFAULT_RADIUS_KM;

  // On open with no bias yet, get the device location just to bias suggestions.
  useEffect(() => {
    if (!visible || near) return;
    let active = true;
    locateDevice().then((r) => {
      // Só enviesa pela GPS se estiver no Brasil (quem testa do exterior não
      // quer sugestões de bairros de Portugal). Fora do Brasil = busca ampla.
      if (active && r.ok && insideBrazilBbox(r.lat, r.lng)) {
        setNear({ lat: r.lat, lng: r.lng });
      }
    });
    return () => {
      active = false;
    };
  }, [visible, near]);

  useEffect(() => {
    const q = query.trim();
    // All state updates live inside the debounced callback (async) — clearing
    // synchronously in the effect body would trigger cascading renders.
    const timer = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      setSuggestions(await searchRegions(q, near ?? undefined));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, near]);

  const pickRegion = (r: GeoResult) => {
    setQuery('');
    setSuggestions([]);
    onChange({ lat: r.lat, lng: r.lng, label: regionLabel(r.label), radiusKm });
  };

  const locate = async () => {
    setError(null);
    setLocating(true);
    const result = await locateDevice();
    setLocating(false);
    if (result.ok) {
      onChange({
        lat: result.lat,
        lng: result.lng,
        label: regionLabel(result.label),
        radiusKm,
      });
    } else {
      setError(
        result.reason === 'denied'
          ? 'Sem permissão de localização — escolha o local no mapa.'
          : 'Não foi possível ler sua localização — escolha o local no mapa.',
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.background }]}
          onPress={(event) => event.stopPropagation()}>
          <Text style={[styles.title, { color: theme.text }]}>
            Onde você quer encontrar vagas?
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sua localização serve só para filtrar a busca — ninguém vê onde você está.
          </Text>

          <View style={[styles.searchBar, { borderColor: theme.line }]}>
            <Ionicons name="search" size={15} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar bairro ou cidade…"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
            />
            {searching && <ActivityIndicator size="small" color={theme.primary} />}
          </View>
          {suggestions.length > 0 && (
            <View style={[styles.suggestions, { borderColor: theme.line }]}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={`${s.lat}-${s.lng}-${i}`}
                  accessibilityRole="button"
                  onPress={() => pickRegion(s)}
                  style={[styles.suggestion, { borderBottomColor: theme.line }]}>
                  <Ionicons name="location-outline" size={14} color={theme.primary} />
                  <Text style={[styles.suggestionLabel, { color: theme.text }]} numberOfLines={1}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {region && (
            <View style={[styles.current, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="location" size={15} color={theme.primarySoftText} />
              <Text style={[styles.currentLabel, { color: theme.primarySoftText }]} numberOfLines={1}>
                {region.label}
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={locating}
            onPress={locate}
            style={[styles.action, { backgroundColor: theme.primary }]}>
            {locating ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>
                📍 Usar minha localização
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMapOpen(true)}
            style={[styles.action, styles.actionGhost, { borderColor: theme.primary }]}>
            <Text style={[styles.actionLabel, { color: theme.primary }]}>
              🗺 Escolher no mapa
            </Text>
          </Pressable>

          {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

          {showRadius && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                RAIO DA BUSCA
              </Text>
              <View style={styles.chips}>
                {RADIUS_OPTIONS_KM.map((value) => {
                  const selected = radiusKm === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      onPress={() => region && onChange({ ...region, radiusKm: value })}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? theme.primary : theme.background,
                          borderColor: selected ? theme.primary : theme.line,
                          opacity: region ? 1 : 0.5,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipLabel,
                          { color: selected ? theme.onPrimary : theme.textSecondary },
                        ]}>
                        {value} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {!region && (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  Defina o local primeiro; o raio padrão é {DEFAULT_RADIUS_KM} km.
                </Text>
              )}
            </>
          )}

          <View style={styles.footer}>
            {region && (
              <Pressable accessibilityRole="button" onPress={() => onChange(null)}>
                <Text style={[styles.clear, { color: theme.textSecondary }]}>
                  Limpar (ver de todo lugar)
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.done, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.doneLabel, { color: theme.text }]}>Pronto</Text>
            </Pressable>
          </View>

          <LocationPicker
            visible={mapOpen}
            initial={region ? { address: region.label, lat: region.lat, lng: region.lng } : null}
            onConfirm={(picked) => {
              setMapOpen(false);
              setError(null);
              onChange({
                lat: picked.lat,
                lng: picked.lng,
                label: regionLabel(picked.address),
                radiusKm,
              });
            }}
            onClose={() => setMapOpen(false)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,10,18,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xlarge - 4,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: -Spacing.one,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 9,
  },
  suggestions: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  suggestionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
  },
  currentLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  action: {
    borderRadius: Radius.medium,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionLabel: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  error: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
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
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  clear: {
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  done: {
    borderRadius: Radius.medium,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    marginLeft: 'auto',
  },
  doneLabel: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
