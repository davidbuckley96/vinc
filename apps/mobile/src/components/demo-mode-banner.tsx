import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Loud banner shown ONLY when the app isn't connected to Supabase (no
 * EXPO_PUBLIC_SUPABASE_* env). In that "demo mode" the screens render mock
 * data and actions are faked — so a build that accidentally ships without
 * the env (e.g. .env not bundled) is obvious instead of looking buggy.
 */
export function DemoModeBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <View style={styles.wrap}>
      <SafeAreaView edges={['top']}>
        <Text style={styles.text}>
          ⚠️ Modo demonstração — dados de exemplo; nada é salvo de verdade
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#B45309' },
  text: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
});
