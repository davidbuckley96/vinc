import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GENDERS, genderLabel, type Gender } from '@vinc/core';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useMyProfile, useUpdateProfile } from '../hooks';

/**
 * Edit profile (D-043): name, bio and the OPTIONAL gender with an opt-in
 * toggle for showing it to whoever might choose the worker (dúvida #20).
 */
export function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useMyProfile();
  const save = useUpdateProfile();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [showGender, setShowGender] = useState(true);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name);
    setBio(profile.data.bio ?? '');
    setGender(profile.data.gender);
    setShowGender(profile.data.showGender);
  }, [profile.data]);

  const submit = async () => {
    setFeedback(null);
    if (name.trim().length < 2) {
      setFeedback({ kind: 'error', text: 'Digite o seu nome.' });
      return;
    }
    try {
      await save.mutateAsync({ name: name.trim(), bio, gender, showGender });
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

          <Text style={[styles.label, { color: theme.textSecondary }]}>SEU NOME</Text>
          <TextInput
            style={inputStyle(theme)}
            placeholder="Seu nome"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>SOBRE VOCÊ (OPCIONAL)</Text>
          <TextInput
            style={[inputStyle(theme), styles.bio]}
            placeholder="Conte um pouco do seu trabalho, sua experiência…"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={bio}
            onChangeText={setBio}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>GÊNERO (OPCIONAL)</Text>
          <View style={styles.chips}>
            {GENDERS.map((option) => {
              const selected = gender === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => setGender(selected ? null : option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.primary : theme.background,
                      borderColor: selected ? theme.primary : theme.line,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: selected ? theme.onPrimary : theme.textSecondary },
                    ]}>
                    {genderLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {gender && (
            <View style={[styles.toggleRow, { borderColor: theme.line }]}>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>
                  Mostrar meu gênero
                </Text>
                <Text style={[styles.toggleHint, { color: theme.textSecondary }]}>
                  Aparece para quem for escolher você numa vaga. Você pode ocultar quando quiser.
                </Text>
              </View>
              <Switch
                value={showGender}
                onValueChange={setShowGender}
                trackColor={{ true: theme.primary }}
              />
            </View>
          )}

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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 8,
  },
  chipLabel: { fontSize: 12.5, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    marginTop: Spacing.one,
  },
  toggleText: { flex: 1 },
  toggleTitle: { fontSize: 13.5, fontWeight: '700' },
  toggleHint: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  feedback: { fontSize: 13.5, fontWeight: '600', textAlign: 'center' },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: { fontSize: 15, fontWeight: '800' },
});
