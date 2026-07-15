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
            {/* V-01 (raiz confirmada pelo David): o círculo de região aproximada
                desenhado DENTRO do WebGL (polígono do MapLibre) era o que travava
                o gesto — por isso o mapa exato (anunciante, sem círculo) era
                fluido e o aproximado (trabalhador) travava. Solução: o mapa é o
                mesmo dos dois lados (sem camadas no WebView) e o indicador vira
                uma CAMADA DO REACT NATIVE por cima (não pesa no gesto): círculo
                translúcido no modo aproximado, pino no exato. O mapa abre e fica
                centrado no ponto (já embaralhado no servidor, D-028). */}
            <LocationMap
              lat={lat}
              lng={lng}
              zoom={approximate ? 15 : 16}
              interactive
              onCenterChange={() => {}}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.overlay}>
              {approximate ? (
                <View style={[styles.approxCircle, { borderColor: theme.primary }]} />
              ) : (
                <Ionicons name="location-sharp" size={40} color={theme.primary} style={styles.pin} />
              )}
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
  overlay: {
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
  // Área aproximada (D-028) desenhada em RN, não no WebGL (V-01): translúcida
  // no tom da marca, centrada no ponto embaralhado.
  approxCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    backgroundColor: 'rgba(124,58,237,0.16)',
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
