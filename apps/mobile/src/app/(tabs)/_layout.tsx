import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Agenda', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'search', title: 'Buscar', icon: 'search-outline', iconActive: 'search' },
  { name: 'post', title: 'Anunciar', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'wallet', title: 'Carteira', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'profile', title: 'Perfil', icon: 'person-outline', iconActive: 'person' },
];

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { status } = useSession();

  // With a configured backend, the app requires sign-in. In demo mode
  // (unconfigured) the tabs stay reachable with mock data.
  if (status === 'signedOut') {
    return <Redirect href="/auth" />;
  }
  if (status === 'loading') {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
