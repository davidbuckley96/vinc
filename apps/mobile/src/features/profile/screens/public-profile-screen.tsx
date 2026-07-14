import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useState } from 'react';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useProfileStats } from '@/features/reviews/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useBlockStatus, useToggleBlock } from '../block-hooks';
import { ProfileView, type ProfileRole } from '../components/profile-view';

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
  const avatarUrl = stats.data?.avatarUrl ?? null;
  const city = stats.data?.city ?? null;

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
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft, borderColor: theme.background }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={[styles.avatarLabel, { color: theme.primarySoftText }]}>
                  {initial}
                </Text>
              )}
            </View>
            <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
            {!!city && (
              <View style={styles.cityRow}>
                <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.city, { color: theme.textSecondary }]}>{city}</Text>
              </View>
            )}
          </View>
          <ProfileView userId={params.id} role={role} fallbackName={name} />

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
          {/* Note below the button (never above) so it can't shift the
              button down just as the person is tapping it. */}
          {blockNote && (
            <Text style={[styles.blockNote, { color: theme.textSecondary }]}>{blockNote}</Text>
          )}
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
    paddingBottom: Spacing.three, // cover area for the overlapping photo (layout A)
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
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
    marginTop: -46, // photo overlaps the header (layout A, D-064)
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  city: {
    fontSize: 12.5,
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
