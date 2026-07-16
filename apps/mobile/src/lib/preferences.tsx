import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * App preferences persisted on device (D-072 follow-up): the theme override
 * (light/dark/system) and the push-notifications on/off switch. Both live here
 * so the color-scheme hooks and the push registrar can read a single source.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'vinc.theme-preference';
const NOTIF_KEY = 'vinc.notifications-enabled';

interface PreferencesValue {
  theme: ThemePreference;
  setTheme: (preference: ThemePreference) => void;
  /** Effective scheme after applying the override to the system value. */
  resolvedScheme: 'light' | 'dark';
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  /** True once the stored values have been read (avoids a wrong first frame). */
  ready: boolean;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const system = useRNColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [notificationsEnabled, setNotifState] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, n] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(NOTIF_KEY),
        ]);
        if (t === 'light' || t === 'dark' || t === 'system') setThemeState(t);
        if (n === 'false') setNotifState(false);
      } catch {
        // first run / storage unavailable — keep defaults
      }
      setReady(true);
    })();
  }, []);

  const setTheme = (preference: ThemePreference) => {
    setThemeState(preference);
    AsyncStorage.setItem(THEME_KEY, preference).catch(() => {});
  };
  const setNotificationsEnabled = (enabled: boolean) => {
    setNotifState(enabled);
    AsyncStorage.setItem(NOTIF_KEY, enabled ? 'true' : 'false').catch(() => {});
  };

  const resolvedScheme: 'light' | 'dark' =
    theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;

  return (
    <PreferencesContext.Provider
      value={{ theme, setTheme, resolvedScheme, notificationsEnabled, setNotificationsEnabled, ready }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used within a PreferencesProvider');
  return value;
}

/**
 * The effective color scheme (theme override applied). Falls back to the raw
 * system value if used outside the provider, so it is always safe to call.
 */
export function useResolvedScheme(): 'light' | 'dark' {
  const value = useContext(PreferencesContext);
  const system = useRNColorScheme();
  if (value) return value.resolvedScheme;
  return system === 'dark' ? 'dark' : 'light';
}
