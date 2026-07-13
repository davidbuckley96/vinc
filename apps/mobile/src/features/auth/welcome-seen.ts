import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * "First-run welcome seen" flag (D-048), per user, on the device. Local by
 * design — it's a first-run nicety; a reinstall showing it again is fine.
 */
const key = (userId?: string) => `vinc.welcome.seen.${userId ?? 'anon'}`;

export async function isWelcomeSeen(userId?: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === '1';
  } catch {
    return true; // storage error → don't nag
  }
}

export function markWelcomeSeen(userId?: string): void {
  AsyncStorage.setItem(key(userId), '1').catch(() => {
    // best-effort
  });
}
