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
   * Approximate mode (D-066): the map is CENTRED ON THE NEIGHBOURHOOD (the
   * stored point is the bairro centroid) with no circle and no pin — showing
   * the whole bairro is the privacy guarantee, and a layer-free map pans
   * smoothly (the old WebGL circle janked the gesture on Android, V-01).
   */
  approximate?: boolean;
  onClose: () => void;
}

/**
 * Full-screen NAVIGABLE map (D-055): the person can pan/zoom to understand
 * where a gig is. Approximate mode opens centered on the neighbourhood with no
 * marker (privacy, D-066); exact mode shows a `marker` anchored to the point so
 * it stays over the place as the map moves. Replaces the old static preview.
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
            {/* V-01/D-066 (raiz confirmada pelo David): o círculo (polígono do
                MapLibre) desenhado DENTRO do WebGL travava o gesto no Android.
                Modo APROXIMADO: sem círculo e sem pino — o mapa abre CENTRADO NO
                BAIRRO (o ponto guardado já é o centro do bairro) e o próprio
                bairro é a privacidade; mapa sem camadas = arrasta liso. Modo
                EXATO (quem já foi escolhido): um `marker` ancorado no ponto (A3,
                docs/13) — um pino leve DENTRO do mapa que segue o lugar ao
                arrastar, ao contrário do overlay RN que ficava preso no centro
                da tela e apontava para o lugar errado depois do primeiro pan. */}
            <LocationMap
              lat={lat}
              lng={lng}
              zoom={approximate ? 14 : 16}
              interactive
              marker={!approximate}
              onCenterChange={() => {}}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <SafeAreaView edges={['bottom']}>
            <View style={[styles.foot, { borderTopColor: theme.line }]}>
              <Text style={[styles.address, { color: theme.text }]}>{address}</Text>
              <Text style={[styles.note, { color: theme.textSecondary }]}>
                {approximate
                  ? 'Mostramos só o bairro para preservar a privacidade. O endereço exato aparece quando você é escolhido. Arraste o mapa para explorar.'
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
