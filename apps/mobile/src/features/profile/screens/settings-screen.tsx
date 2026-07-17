import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Constants from 'expo-constants';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth-actions';
import { useSession } from '@/features/auth/session-context';
import { pushSelfTest } from '@/features/notifications/push';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences, type ThemePreference } from '@/lib/preferences';
import { supabase } from '@/lib/supabase';

type IconName = keyof typeof Ionicons.glyphMap;

interface Row {
  icon: IconName;
  label: string;
  onPress: () => void;
}

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Automático',
  light: 'Claro',
  dark: 'Escuro',
};

/**
 * Configurações (G-08 / D-072, opção A): the app's settings, split out of the
 * profile so the profile stays about "who I am". Tema (light/dark/system) and
 * Notificações (push on/off) are persisted via the preferences store.
 */
export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const { theme: themePref, setTheme, notificationsEnabled, setNotificationsEnabled } =
    usePreferences();
  const [testingPush, setTestingPush] = useState(false);

  const testPush = async () => {
    setTestingPush(true);
    const result = await pushSelfTest(supabase, userId);
    setTestingPush(false);
    Alert.alert('Notificações push', result);
  };

  const chooseTheme = () => {
    Alert.alert('Tema', 'Como o app deve aparecer?', [
      { text: 'Automático (do celular)', onPress: () => setTheme('system') },
      { text: 'Claro', onPress: () => setTheme('light') },
      { text: 'Escuro', onPress: () => setTheme('dark') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const account: Row[] = [
    { icon: 'person-outline', label: 'Editar perfil', onPress: () => router.push('/edit-profile') },
    { icon: 'key-outline', label: 'Minha chave Pix', onPress: () => router.push('/payout') },
  ];
  // "Falar com a Vi" saiu (feedback do David): a Central de Ajuda já leva à Vi,
  // e o link direto apontava para uma rota inexistente (Unmatched Route).
  const help: Row[] = [
    { icon: 'help-circle-outline', label: 'Central de Ajuda', onPress: () => router.push('/help') },
  ];

  const navRow = (row: Row) => (
    <Pressable
      key={row.label}
      accessibilityRole="button"
      onPress={row.onPress}
      style={[styles.row, { borderColor: theme.line }]}>
      <Ionicons name={row.icon} size={18} color={theme.primary} />
      <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.column}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voltar"
                onPress={() => router.back()}
                hitSlop={12}>
                <Ionicons name="chevron-back" size={24} color={theme.onPrimary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: theme.onPrimary }]}>Configurações</Text>
            </View>
          </SafeAreaView>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>CONTA</Text>
            {account.map(navRow)}
          </View>

          <View style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>PREFERÊNCIAS</Text>
            <Pressable
              accessibilityRole="button"
              onPress={chooseTheme}
              style={[styles.row, { borderColor: theme.line }]}>
              <Ionicons name="contrast-outline" size={18} color={theme.primary} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Tema</Text>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
                {THEME_LABELS[themePref]}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
            <View style={[styles.row, { borderColor: theme.line }]}>
              <Ionicons name="notifications-outline" size={18} color={theme.primary} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Notificações</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: theme.primary }}
                accessibilityLabel="Ativar ou desativar notificações"
              />
            </View>
            {navRow({
              icon: 'megaphone-outline',
              label: 'Alertas de vagas',
              onPress: () => router.push('/alerts'),
            })}
          </View>

          <View style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>AJUDA</Text>
            {help.map(navRow)}
          </View>

          <View style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>SOBRE</Text>
            <View style={[styles.row, { borderColor: theme.line }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>Versão</Text>
              <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{version}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={testingPush}
              onPress={testPush}
              style={[styles.row, { borderColor: theme.line }]}>
              <Ionicons name="notifications-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>
                {testingPush ? 'Testando…' : 'Testar notificações push'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => signOut()}
            style={[styles.signOut, { borderColor: theme.danger }]}>
            <Ionicons name="log-out-outline" size={16} color={theme.danger} />
            <Text style={[styles.signOutLabel, { color: theme.danger }]}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  header: {
    borderBottomLeftRadius: Radius.xlarge,
    borderBottomRightRadius: Radius.xlarge,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  group: { gap: Spacing.one + 2 },
  groupTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, marginLeft: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabel: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  rowValue: { fontSize: 12.5, fontWeight: '600', marginRight: 4 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: 12,
    marginTop: Spacing.one,
  },
  signOutLabel: { fontSize: 13.5, fontWeight: '700' },
});
