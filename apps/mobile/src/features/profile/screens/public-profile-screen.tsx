import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState } from 'react';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProfileStats } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useBlockStatus, useToggleBlock } from '../block-hooks';
import { genderLabel } from '@vinc/core';

import { ProfileView, type ProfileRole } from '../components/profile-view';
import { usePublicGender } from '../hooks';

/**
 * Public profile of another user. The role shown comes from the navigation
 * context (D-011): opened from a gig listing → poster; opened by a poster
 * looking at their worker → worker.
 */
export function PublicProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; role?: string; name?: string }>();
  const role: ProfileRole = params.role === 'worker' ? 'worker' : 'poster';
  const stats = useProfileStats(params.id);
  const gender = usePublicGender(params.id);
  const blockStatus = useBlockStatus(params.id);
  const toggleBlock = useToggleBlock(params.id);
  const [blockNote, setBlockNote] = useState<string | null>(null);

  const blocked = blockStatus.data?.blockedByMe ?? false;
  const onToggleBlock = async () => {
    setBlockNote(null);
    try {
      await toggleBlock.mutateAsync(!blocked);
      setBlockNote(
        blocked
          ? 'Usuário desbloqueado.'
          : 'Usuário bloqueado: vocês não verão mais as vagas um do outro.',
      );
    } catch {
      setBlockNote('Não foi possível completar. Tente de novo.');
    }
  };

  const name = stats.data?.name ?? params.name ?? 'Perfil';
  const initial = name.trim().charAt(0).toUpperCase();

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
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.who}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.avatarLabel, { color: theme.primarySoftText }]}>
                {initial}
              </Text>
            </View>
            <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
            {gender.data && (
              <Text style={[styles.genderLine, { color: theme.textSecondary }]}>
                {genderLabel(gender.data)}
              </Text>
            )}
          </View>
          <ProfileView userId={params.id} role={role} fallbackName={name} />

          {blockNote && (
            <Text style={[styles.blockNote, { color: theme.textSecondary }]}>{blockNote}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={toggleBlock.isPending}
            onPress={onToggleBlock}
            style={[styles.blockButton, { borderColor: theme.danger }]}>
            <Ionicons
              name={blocked ? 'lock-open-outline' : 'ban-outline'}
              size={16}
              color={theme.danger}
            />
            <Text style={[styles.blockLabel, { color: theme.danger }]}>
              {blocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
            </Text>
          </Pressable>
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
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
    paddingBottom: Spacing.five,
  },
  who: {
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.one,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '800',
  },
  genderLine: {
    fontSize: 13,
    marginTop: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  blockNote: {
    fontSize: 12.5,
    textAlign: 'center',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 11,
    marginTop: Spacing.two,
  },
  blockLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
