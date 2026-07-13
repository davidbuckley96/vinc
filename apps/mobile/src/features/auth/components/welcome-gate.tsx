import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

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
      pathname !== '/welcome' &&
      pathname !== '/complete-signup' &&
      pathname !== '/auth'
    ) {
      router.replace('/welcome');
    }
  }, [ready, pathname, router]);

  return null;
}
