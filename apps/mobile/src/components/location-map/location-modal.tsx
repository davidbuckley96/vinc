import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { LocationMap } from './location-map';

interface LocationModalProps {
  visible: boolean;
  lat: number;
  lng: number;
  address: string;
  onClose: () => void;
}

/**
 * Viewing modal (docs/02 §2.1): tapping a gig's address opens the map
 * with the pin and a close button — same in every screen.
 */
export function LocationModal({ visible, lat, lng, address, onClose }: LocationModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.background }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.mapWrap}>
            <LocationMap lat={lat} lng={lng} zoom={15} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.pinWrap}>
              <Ionicons
                name="location-sharp"
                size={40}
                color={theme.primary}
                style={styles.pin}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar o mapa"
              onPress={onClose}
              style={[styles.close, { backgroundColor: theme.background }]}>
              <Ionicons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.foot}>
            <Text style={[styles.address, { color: theme.text }]}>{address}</Text>
          </View>
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
    overflow: 'hidden',
  },
  mapWrap: {
    height: 280,
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
  close: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  foot: {
    padding: Spacing.three,
  },
  address: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
