import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { usePayoutAccount } from '@/features/wallet/hooks';

import { useSession } from '../session-context';
import { isWelcomeSeen } from '../welcome-seen';

/**
 * First-run welcome (D-048, rodada 18 B). Shows `/welcome` once, only after
 * the account is COMPLETE (signed in + payout set, so it never competes
 * with the payout completion gate). Renders nothing.
 */
export function WelcomeGate() {
  const { status, session } = useSession();
  const userId = session?.user.id ?? null;
  const payout = usePayoutAccount();
  const pathname = usePathname();
  const router = useRouter();

  const [seen, setSeen] = useState<boolean | null>(null);
  // Redirect to /welcome at most ONCE per session. Without this, tapping
  // "Depois eu vejo" (or any choice) persists the flag but this component's
  // `seen` state stays stale (false), so the gate would immediately bounce
  // the user back to /welcome — an inescapable loop until an app restart.
  const redirected = useRef(false);

  useEffect(() => {
    if (!userId) {
      setSeen(null);
      return;
    }
    let active = true;
    isWelcomeSeen(userId).then((value) => {
      if (active) setSeen(value);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const ready =
    status === 'signedIn' && payout.isSuccess && !!payout.data && seen === false;

  useEffect(() => {
    if (
      ready &&
      !redirected.current &&
      pathname !== '/welcome' &&
      pathname !== '/complete-signup' &&
      pathname !== '/auth'
    ) {
      redirected.current = true;
      router.replace('/welcome');
    }
  }, [ready, pathname, router]);

  return null;
}
