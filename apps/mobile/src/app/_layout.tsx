import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider, Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync();

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Agenda', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'search', title: 'Buscar', icon: 'search-outline', iconActive: 'search' },
  { name: 'post', title: 'Anunciar', icon: 'add-circle-outline', iconActive: 'add-circle' },
  { name: 'wallet', title: 'Carteira', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'profile', title: 'Perfil', icon: 'person-outline', iconActive: 'person' },
];

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const colors = Colors[dark ? 'dark' : 'light'];
  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.line,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
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
    </ThemeProvider>
  );
}
