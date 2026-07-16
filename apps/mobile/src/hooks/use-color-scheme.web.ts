// Web mirrors native: honour the Tema override from Configurações. The
// preferences context already re-computes on the client after mount, so the
// separate hydration guard the old hook needed is no longer necessary.
export { useResolvedScheme as useColorScheme } from '@/lib/preferences';
