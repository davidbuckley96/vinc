import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { firstName } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useMyProfile, useUpdateProfile, useUploadAvatar } from '../hooks';

/**
 * Edit profile (D-043/D-044): name and an optional bio. Gender was
 * dropped (D-044) — the first name signals it and forcing/showing gender
 * risked discomfort and discrimination; the chat clarifies the rest.
 */
export function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useMyProfile();
  const save = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name);
    setBio(profile.data.bio ?? '');
    setCity(profile.data.city ?? '');
    setAvatarUrl(profile.data.avatarUrl ?? null);
  }, [profile.data]);

  const initial = (name || 'V').trim().charAt(0).toUpperCase();

  const changePhoto = async () => {
    setFeedback(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback({ kind: 'error', text: 'Permita o acesso às fotos para escolher uma imagem.' });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const url = await uploadAvatar.mutateAsync({
      uri: asset.uri,
      mime: asset.mimeType ?? 'image/jpeg',
    });
    if (url) setAvatarUrl(url);
    else setFeedback({ kind: 'error', text: 'Não foi possível enviar a foto. Tente de novo.' });
  };

  const submit = async () => {
    setFeedback(null);
    if (name.trim().length < 2) {
      setFeedback({ kind: 'error', text: 'Digite o seu nome.' });
      return;
    }
    try {
      const result = await save.mutateAsync({ name: firstName(name), bio, city: city.trim() || null });
      if (result === 'contact_in_text') {
        setFeedback({
          kind: 'error',
          text: 'Não coloque telefone, e-mail, redes sociais ou links no perfil.',
        });
        return;
      }
      if (result === 'error') {
        setFeedback({ kind: 'error', text: 'Não foi possível salvar agora. Tente de novo.' });
        return;
      }
      setFeedback({ kind: 'success', text: 'Perfil salvo!' });
      setTimeout(() => router.back(), 1000);
    } catch {
      setFeedback({ kind: 'error', text: 'Não foi possível salvar agora. Tente de novo.' });
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
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Editar perfil</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {profile.isLoading && <ActivityIndicator color={theme.primary} />}

          <View style={styles.photoBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trocar foto de perfil"
              onPress={changePhoto}
              disabled={uploadAvatar.isPending}
              style={[styles.photo, { backgroundColor: theme.primarySoft }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.photoImg} contentFit="cover" />
              ) : (
                <Text style={[styles.photoInitial, { color: theme.primarySoftText }]}>{initial}</Text>
              )}
              <View style={[styles.photoBadge, { backgroundColor: theme.primary }]}>
                {uploadAvatar.isPending ? (
                  <ActivityIndicator size="small" color={theme.onPrimary} />
                ) : (
                  <Ionicons name="camera" size={15} color={theme.onPrimary} />
                )}
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={changePhoto} disabled={uploadAvatar.isPending}>
              <Text style={[styles.photoLabel, { color: theme.primary }]}>
                {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>SEU PRIMEIRO NOME</Text>
          <TextInput
            style={inputStyle(theme)}
            placeholder="Seu primeiro nome"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>SUA CIDADE (OPCIONAL)</Text>
          <TextInput
            style={inputStyle(theme)}
            placeholder="Ex.: Aracaju, SE"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            value={city}
            onChangeText={setCity}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Só a cidade aparece no seu perfil — nunca seu endereço.
          </Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>SOBRE VOCÊ (OPCIONAL)</Text>
          <TextInput
            style={[inputStyle(theme), styles.bio]}
            placeholder="Conte um pouco do seu trabalho, sua experiência…"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={bio}
            onChangeText={setBio}
          />

          {feedback && (
            <Text
              style={[
                styles.feedback,
                { color: feedback.kind === 'error' ? theme.danger : theme.success },
              ]}>
              {feedback.text}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={save.isPending}
            onPress={submit}
            style={[styles.cta, { backgroundColor: theme.primary, opacity: save.isPending ? 0.7 : 1 }]}>
            {save.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Text style={[styles.ctaLabel, { color: theme.onPrimary }]}>Salvar perfil</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const inputStyle = (theme: ReturnType<typeof useTheme>) => ({
  borderWidth: 1.5,
  borderColor: theme.line,
  borderRadius: Radius.medium,
  padding: Spacing.two + 2,
  fontSize: 14.5,
  color: theme.text,
  backgroundColor: theme.background,
});

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.one,
  },
  bio: { minHeight: 88, textAlignVertical: 'top' },
  hint: { fontSize: 11.5, lineHeight: 16, marginTop: -Spacing.one + 2 },
  photoBlock: { alignItems: 'center', gap: 6, marginBottom: Spacing.one },
  photo: {
    width: 92,
    height: 92,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoInitial: { fontSize: 34, fontWeight: '800' },
  photoBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoLabel: { fontSize: 13.5, fontWeight: '800' },
  feedback: { fontSize: 13.5, fontWeight: '600', textAlign: 'center' },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: { fontSize: 15, fontWeight: '800' },
});
