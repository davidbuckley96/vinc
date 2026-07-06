import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

import { useCompleteService, useServiceDetail } from '../hooks';

const MAX_PHOTOS = 5;
const REPORT_MAX = 2000;

const RESULT_MESSAGES: Record<string, string> = {
  state_changed: 'O status mudou agora mesmo. Atualize e tente de novo.',
  invalid_action: 'Este serviço não está mais em andamento.',
  forbidden: 'Você não participa deste serviço.',
  unauthorized: 'Entre na sua conta para continuar.',
  not_found: 'Este serviço não existe mais.',
  invalid_request: 'Algo deu errado. Tente de novo.',
  network_error: 'Sem conexão. Verifique sua internet e tente de novo.',
};

/**
 * Worker finishes the service (D-032): photos of the result + a short
 * report, both OPTIONAL but encouraged — they are the worker's proof if
 * the poster disputes with old photos (server upload time is what the
 * analysis trusts).
 */
export function CompleteServiceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const service = useServiceDetail(gigId);
  const complete = useCompleteService(gigId);

  const [report, setReport] = useState('');
  const [photos, setPhotos] = useState<{ uri: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPhotos((current) =>
      [...current, ...result.assets.map((asset) => ({ uri: asset.uri }))].slice(0, MAX_PHOTOS),
    );
  };

  const submit = async () => {
    setError(null);
    const result = await complete.mutateAsync({ report, photos });
    if (result === 'done') {
      router.replace(`/service/${gigId}`);
    } else {
      setError(RESULT_MESSAGES[result] ?? RESULT_MESSAGES.invalid_request!);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
              <View>
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  Finalizar serviço
                </Text>
                {service.data && (
                  <Text
                    style={[styles.headerSubtitle, { color: theme.onPrimaryMuted }]}
                    numberOfLines={1}>
                    {service.data.title}
                  </Text>
                )}
              </View>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={[styles.shield, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="shield-checkmark" size={22} color={theme.primarySoftText} />
            <Text style={[styles.shieldText, { color: theme.primarySoftMeta }]}>
              Fotos de como ficou e um resumo do que você fez são opcionais, mas{' '}
              <Text style={{ fontWeight: '800', color: theme.primarySoftText }}>
                te protegem
              </Text>{' '}
              se houver contestação — fica registrado que foram enviadas agora, no fim do
              serviço.
            </Text>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            FOTOS DE COMO FICOU (ATÉ {MAX_PHOTOS})
          </Text>
          <View style={styles.photos}>
            {photos.map((photo, index) => (
              <View key={photo.uri} style={styles.thumbWrap}>
                <Image source={{ uri: photo.uri }} style={styles.thumb} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover foto ${index + 1}`}
                  onPress={() => setPhotos((current) => current.filter((item) => item !== photo))}
                  style={styles.thumbRemove}>
                  <Ionicons name="close" size={11} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar fotos"
                onPress={addPhotos}
                style={[
                  styles.addPhoto,
                  { borderColor: theme.primary, backgroundColor: theme.primarySoft },
                ]}>
                <Ionicons name="camera" size={20} color={theme.primary} />
              </Pressable>
            )}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            O QUE FOI FEITO (OPCIONAL)
          </Text>
          <TextInput
            style={[
              styles.textarea,
              { borderColor: theme.line, color: theme.text, backgroundColor: theme.background },
            ]}
            multiline
            maxLength={REPORT_MAX}
            placeholder="Ex.: limpei todos os cômodos, troquei as roupas de cama e deixei o lixo na lixeira do prédio."
            placeholderTextColor={theme.textSecondary}
            value={report}
            onChangeText={setReport}
          />

          {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={complete.isPending}
            onPress={submit}
            style={[
              styles.cta,
              { backgroundColor: theme.primary, opacity: complete.isPending ? 0.7 : 1 },
            ]}>
            {complete.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.ctaLabel, { color: theme.onPrimary }]}>
                Finalizar serviço
              </Text>
            )}
          </Pressable>
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            O anunciante confirma a conclusão e o pagamento cai na sua carteira. Sem resposta,
            libera sozinho em 48h.
          </Text>
        </ScrollView>
      </View>
    </View>
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  shield: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    borderRadius: Radius.large,
    padding: Spacing.two + 3,
  },
  shieldText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  photos: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    flexWrap: 'wrap',
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium - 2,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1c1f24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 56,
    height: 56,
    borderRadius: Radius.medium - 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
});
