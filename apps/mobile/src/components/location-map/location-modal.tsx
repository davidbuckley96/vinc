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
            {/* EXPERIMENTO (V-01): para achar a raiz do travamento do gesto, este
                mapa foi igualado ao da criação — SEM o círculo de região
                aproximada e SEM marcador desenhados dentro do WebView, só o mapa
                interativo + um pino central por cima (RN). Se ficar fluido, o
                culpado era o desenho do círculo/anonimato; aí re-adicionamos de
                outra forma. `circleMeters`/`marker` comentados de propósito. */}
            <LocationMap
              lat={lat}
              lng={lng}
              zoom={16}
              interactive
              onCenterChange={() => {}}
              // circleMeters={approximate ? APPROX_RADIUS_M : undefined}
              // marker={!approximate}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.pinWrap}>
              <Ionicons name="location-sharp" size={40} color={theme.primary} style={styles.pin} />
            </View>
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
  pinWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    transform: [{ translateY: -20 }],
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
