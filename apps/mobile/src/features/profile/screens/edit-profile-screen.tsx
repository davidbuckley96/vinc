import { Ionicons } from '@expo/vector-icons';
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

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useMyProfile, useUpdateProfile } from '../hooks';

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

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.name);
    setBio(profile.data.bio ?? '');
  }, [profile.data]);

  const submit = async () => {
    setFeedback(null);
    if (name.trim().length < 2) {
      setFeedback({ kind: 'error', text: 'Digite o seu nome.' });
      return;
    }
    try {
      await save.mutateAsync({ name: name.trim(), bio });
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
  feedback: { fontSize: 13.5, fontWeight: '600', textAlign: 'center' },
  cta: {
    borderRadius: Radius.large - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaLabel: { fontSize: 15, fontWeight: '800' },
});
