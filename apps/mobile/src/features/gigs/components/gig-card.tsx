import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OpenGig } from '@vinc/api';
import { formatBRL } from '@vinc/core';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function formatWhen(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${WEEKDAYS[start.getDay()]} ${start.getDate()} · ${start.getHours()}h–${end.getHours()}h`;
}

interface Props {
  gig: OpenGig;
  categoryName?: string;
  highlighted?: boolean;
  onPress?: () => void;
}

/** Gig listing card: what, when/where, price and who is posting (D-007). */
export function GigCard({ gig, categoryName, highlighted, onPress }: Props) {
  const theme = useTheme();
  const initial = gig.posterName.trim().charAt(0).toUpperCase() || '?';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[
        styles.card,
        { borderColor: highlighted ? theme.primary : theme.line },
        highlighted && styles.cardHighlighted,
      ]}>
      <View style={styles.top}>
        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {gig.title}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
            {[categoryName, formatWhen(gig.startsAt, gig.endsAt), gig.area]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Text style={[styles.price, { color: theme.primary }]}>
          {formatBRL(gig.priceCents)}
        </Text>
      </View>
      <View style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.avatarLabel, { color: theme.primarySoftText }]}>{initial}</Text>
        </View>
        <Text style={[styles.whoLabel, { color: theme.textSecondary }]} numberOfLines={1}>
          {gig.posterName}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large - 2,
    padding: Spacing.two + 4,
    gap: Spacing.two,
  },
  cardHighlighted: {
    borderWidth: 1.5,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  whoLabel: {
    fontSize: 12,
    flex: 1,
  },
});
