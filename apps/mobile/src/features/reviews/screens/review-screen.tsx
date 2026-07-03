import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useServiceDetail } from '@/features/services/hooks';
import { useTheme } from '@/hooks/use-theme';

import { useSubmitReview } from '../hooks';
import { RATING_LABELS, tagsFor, tagsQuestion } from '../tags';

/**
 * Post-service review — hybrid design (D-009): big stars with a word label,
 * quick tags that adapt to the rating and the reviewee's role, and an
 * optional free comment.
 */
export function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const service = useServiceDetail(gigId);
  const submit = useSubmitReview();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null,
  );

  const data = service.data;
  const revieweeRole = data?.role === 'poster' ? 'worker' : 'poster';
  const name = data?.counterpartName ?? 'a outra pessoa';
  const initial = name.trim().charAt(0).toUpperCase();
  const availableTags = rating > 0 ? tagsFor(revieweeRole, rating) : [];

  const pickRating = (value: number) => {
    setRating(value);
    // tags flip between praise/issues with the rating — drop stale picks
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );

  const send = async () => {
    if (!data || !data.counterpartId) return;
    setFeedback(null);
    if (rating === 0) {
      setFeedback({ kind: 'error', text: 'Toque nas estrelas para dar sua nota.' });
      return;
    }
    try {
      await submit.mutateAsync({
        gigId,
        revieweeId: data.counterpartId,
        revieweeRole,
        rating,
        comment,
        tags: selectedTags,
      });
      setFeedback({ kind: 'success', text: 'Avaliação enviada. Obrigado!' });
      setTimeout(() => router.back(), 1200);
    } catch {
      setFeedback({
        kind: 'error',
        text: 'Não foi possível enviar. Talvez você já tenha avaliado este serviço.',
      });
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
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>
                Avaliar {data?.counterpartName ?? ''}
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>

        {service.isLoading && <ActivityIndicator color={theme.primary} style={styles.loading} />}

        {data && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.who}>
              <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
                <Text style={[styles.avatarLabel, { color: theme.primarySoftText }]}>
                  {initial}
                </Text>
              </View>
              <Text style={[styles.question, { color: theme.text }]}>Como foi com {name}?</Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Sua nota ajuda outras pessoas a confiar.
              </Text>
            </View>

            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`${value} estrelas`}
                  onPress={() => pickRating(value)}>
                  <Ionicons
                    name={value <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={value <= rating ? '#F59E0B' : theme.line}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[styles.ratingLabel, { color: theme.primarySoftText }]}>
                {RATING_LABELS[rating]}
              </Text>
            )}

            {rating > 0 && (
              <>
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  {tagsQuestion(rating)}
                </Text>
                <View style={styles.tags}>
                  {availableTags.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    return (
                      <Pressable
                        key={tag}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => toggleTag(tag)}
                        style={[
                          styles.tag,
                          {
                            borderColor: selected ? theme.primary : theme.line,
                            backgroundColor: selected ? theme.primarySoft : theme.background,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.tagLabel,
                            { color: selected ? theme.primarySoftText : theme.textSecondary },
                          ]}>
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <TextInput
              style={[
                styles.comment,
                { borderColor: theme.line, color: theme.text },
              ]}
              placeholder="Escreva um comentário (opcional)"
              placeholderTextColor={theme.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
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
              disabled={submit.isPending}
              onPress={send}
              style={[
                styles.send,
                { backgroundColor: theme.primary, opacity: submit.isPending ? 0.7 : 1 },
              ]}>
              {submit.isPending ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={[styles.sendLabel, { color: theme.onPrimary }]}>
                  Enviar avaliação
                </Text>
              )}
            </Pressable>
            <Text style={[styles.hint, { color: theme.textSecondary, textAlign: 'center' }]}>
              Você não pode mudar a nota depois.
            </Text>
          </ScrollView>
        )}
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
  },
  loading: {
    marginTop: Spacing.five,
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
    gap: 4,
    marginTop: Spacing.two,
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
  question: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  hint: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two - 2,
    justifyContent: 'center',
  },
  tag: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
  },
  tagLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  comment: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: Spacing.one,
  },
  feedback: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  send: {
    borderRadius: Radius.large - 2,
    paddingVertical: 15,
    alignItems: 'center',
  },
  sendLabel: {
    fontSize: 15.5,
    fontWeight: '800',
  },
});
