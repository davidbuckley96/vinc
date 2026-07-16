// The app's color scheme honours the user's Tema override (light/dark/system)
// from Configurações (D-072 follow-up), falling back to the system value.
export { useResolvedScheme as useColorScheme } from '@/lib/preferences';
