import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { LocationMap } from './location-map';

interface LocationModalProps {
  visible: boolean;
  lat: number;
  lng: number;
  address: string;
  /**
   * Approximate mode (D-028): a translucent radius circle instead of a pin —
   * the point shown is already fuzzed, and a pin would read as exact.
   */
  approximate?: boolean;
  onClose: () => void;
}

// Radius of the shown area for an approximate pin (matches the 250–600 m
// server-side fuzz, D-028) — comfortably covers where the place really is.
const APPROX_RADIUS_M = 600;

/**
 * Full-screen NAVIGABLE map (D-055): the person can pan/zoom to understand
 * where a gig is — the radius circle (approximate) or the pin (exact) stays
 * anchored to the place as the map moves. Replaces the old static preview.
 */
export function LocationModal({ visible, lat, lng, address, approximate, onClose }: LocationModalProps) {
  const theme = useTheme();

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
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                  {approximate ? 'Região do serviço' : 'Local do serviço'}
                </Text>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.mapArea}>
            <LocationMap
              lat={lat}
              lng={lng}
              zoom={approximate ? 14 : 16}
              interactive
              circleMeters={approximate ? APPROX_RADIUS_M : undefined}
              marker={!approximate}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <SafeAreaView edges={['bottom']}>
            <View style={[styles.foot, { borderTopColor: theme.line }]}>
              <Text style={[styles.address, { color: theme.text }]}>{address}</Text>
              <Text style={[styles.note, { color: theme.textSecondary }]}>
                {approximate
                  ? 'Local aproximado — o endereço exato aparece quando você é escolhido. Arraste o mapa para explorar a região.'
                  : 'Arraste o mapa para explorar. Toque em fechar quando terminar.'}
              </Text>
            </View>
          </SafeAreaView>
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
    flex: 1,
  },
  mapArea: {
    flex: 1,
  },
  foot: {
    padding: Spacing.three,
    borderTopWidth: 1,
    gap: 4,
  },
  address: {
    fontSize: 14,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
  },
});
