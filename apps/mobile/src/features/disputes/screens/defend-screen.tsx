import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { choosePhotos } from '@/lib/photo-picker';

import { useRespondDispute, type DisputePhoto } from '../hooks';

const MIN = 10;
const MAX = 2000;
const MAX_PHOTOS = 5;

/**
 * Worker defense on a no-show dispute (D-073). The worker explains their side
 * — e.g. "I arrived but the poster never gave me the start code" — with optional
 * photos. Support weighs this before deciding.
 */
export function DefendScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const respond = useRespondDispute(gigId);

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<DisputePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const addPhotos = () => {
    setError(null);
    choosePhotos({
      multiple: true,
      limit: MAX_PHOTOS - photos.length,
      onResult: (picked) => setPhotos((cur) => [...cur, ...picked].slice(0, MAX_PHOTOS)),
      onCameraDenied: () => setError('Permita o acesso à câmera para tirar uma foto.'),
    });
  };

  const submit = async () => {
    setError(null);
    if (text.trim().length < MIN) {
      setError('Conte com um pouco mais de detalhe o que aconteceu.');
      return;
    }
    const result = await respond.mutateAsync({ response: text.trim(), photos });
    if (result === 'responded') {
      setDone(true);
      setTimeout(() => router.back(), 1400);
    } else if (result === 'already_resolved') {
      setError('Esta disputa já foi decidida pelo suporte.');
    } else {
      setError('Não foi possível enviar agora. Tente de novo.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => router.back()}
                hitSlop={12}>
                <Ionicons name="chevron-back" size={24} color={theme.onPrimary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Me defender</Text>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={[styles.lead, { color: theme.textSecondary }]}>
            O anunciante abriu uma disputa dizendo que você não apareceu. Conte a sua
            versão — por exemplo, se você chegou mas não recebeu o código de início, ou o
            que impediu o serviço de começar. O suporte vai analisar antes de qualquer
            cobrança.
          </Text>

          <TextInput
            style={[styles.input, { borderColor: theme.line, color: theme.text }]}
            placeholder="Explique o que aconteceu…"
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX}
          />

          <Pressable
            accessibilityRole="button"
            onPress={addPhotos}
            disabled={photos.length >= MAX_PHOTOS}
            style={[styles.addPhotos, { borderColor: theme.line }]}>
            <Ionicons name="camera-outline" size={17} color={theme.primary} />
            <Text style={[styles.addPhotosLabel, { color: theme.primary }]}>
              {photos.length > 0 ? `Fotos (${photos.length}/${MAX_PHOTOS})` : 'Adicionar fotos (opcional)'}
            </Text>
          </Pressable>

          {photos.length > 0 && (
            <View style={styles.photoRow}>
              {photos.map((photo, index) => (
                <View key={`${index}-${photo.uri.slice(-16)}`} style={styles.thumbWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.thumb} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remover foto"
                    onPress={() => setPhotos((cur) => cur.filter((_, i) => i !== index))}
                    style={[styles.thumbX, { backgroundColor: theme.danger }]}>
                    <Ionicons name="close" size={12} color={theme.onPrimary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
          {done && (
            <Text style={[styles.error, { color: theme.success }]}>
              Defesa enviada. O suporte vai analisar.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={respond.isPending || done}
            onPress={submit}
            style={[styles.submit, { backgroundColor: theme.primary, opacity: respond.isPending ? 0.7 : 1 }]}>
            {respond.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.submitLabel, { color: theme.onPrimary }]}>Enviar defesa</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: { borderBottomLeftRadius: Radius.xlarge, borderBottomRightRadius: Radius.xlarge },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two + 2 },
  lead: { fontSize: 13, lineHeight: 18.5 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  addPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 12,
  },
  addPhotosLabel: { fontSize: 13.5, fontWeight: '700' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  thumbX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  submit: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  submitLabel: { fontSize: 15, fontWeight: '800' },
});
