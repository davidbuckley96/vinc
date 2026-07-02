import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '@vinc/api';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { GigCard } from '../components/gig-card';
import { useCategories, useOpenGigs } from '../hooks';

/**
 * Search screen — "categories first" (D-007): big category tiles; tapping one
 * drills into that category's open gigs. Recent gigs are always visible below.
 */
export function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const categories = useCategories();
  const gigs = useOpenGigs(category?.id);

  const categoryName = (id: string) =>
    categories.data?.find((item) => item.id === id)?.name;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              {category ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar para as categorias"
                  onPress={() => setCategory(null)}
                  style={styles.back}>
                  <Ionicons name="chevron-back" size={22} color={theme.onPrimary} />
                  <Text style={[styles.headerTitle, { color: theme.onPrimary }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                  O que você quer fazer?
                </Text>
              )}
            </View>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {!category && (
            <>
              {categories.isLoading && <ActivityIndicator color={theme.primary} />}
              {categories.isError && (
                <Text style={[styles.feedback, { color: theme.danger }]}>
                  Não foi possível carregar as categorias. Verifique sua conexão.
                </Text>
              )}
              <View style={styles.grid}>
                {categories.data?.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => setCategory(item)}
                    style={[styles.tile, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons
                      name={(item.icon ?? 'briefcase') as keyof typeof Ionicons.glyphMap}
                      size={26}
                      color={theme.primarySoftText}
                    />
                    <Text style={[styles.tileLabel, { color: theme.primarySoftText }]}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                VAGAS RECENTES
              </Text>
            </>
          )}

          {gigs.isLoading && <ActivityIndicator color={theme.primary} />}
          {gigs.isError && (
            <Text style={[styles.feedback, { color: theme.danger }]}>
              Não foi possível carregar as vagas. Verifique sua conexão.
            </Text>
          )}
          {gigs.data?.length === 0 && (
            <Text style={[styles.feedback, { color: theme.textSecondary }]}>
              Nenhuma vaga aberta {category ? 'nesta categoria' : 'no momento'}. Volte mais
              tarde!
            </Text>
          )}
          {gigs.data?.map((gig) => (
            <GigCard
              key={gig.id}
              gig={gig}
              categoryName={categoryName(gig.categoryId)}
              onPress={() => router.push(`/gig/${gig.id}`)}
            />
          ))}
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
  headerRow: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: -6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two + 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two + 2,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
  },
  feedback: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
});
