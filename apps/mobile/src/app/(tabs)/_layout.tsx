import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/features/auth/session-context';
import { useTotalUnreadMessages } from '@/features/messages/hooks';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Agenda', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'search', title: 'Buscar', icon: 'search-outline', iconActive: 'search' },
  { name: 'post', title: 'Anunciar', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'messages', title: 'Mensagens', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'wallet', title: 'Carteira', icon: 'wallet-outline', iconActive: 'wallet' },
  // "Perfil" saiu da barra (G-08/D-072): abre pelo avatar do topo → /profile.
];

// Browse detail routes moved under (tabs) so the bar stays visible (G-02).
const DETAIL_ROUTES = [
  'gig/[id]',
  'gig/edit/[id]',
  'service/[id]',
  'user/[id]',
  'chat/[gigId]',
];

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { status } = useSession();
  const unreadMessages = useTotalUnreadMessages();

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
      // G-02 (docs/16): the browse detail screens (gig/service/user/chat) live
      // INSIDE this tab group so the bar stays visible on them. `backBehavior:
      // history` makes the back button return to the previous screen instead of
      // the first tab.
      backBehavior="history"
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
            // Unread badge on the Messages tab (D-070).
            tabBarBadge:
              tab.name === 'messages' && unreadMessages > 0 ? unreadMessages : undefined,
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
      {/* Detail screens: reachable and keep the tab bar, but no tab button. */}
      {DETAIL_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
