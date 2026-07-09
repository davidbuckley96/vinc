import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { usePayoutAccount } from '@/features/wallet/hooks';

import { useSession } from '../session-context';

/**
 * D-038: an account is not complete without the receiving Pix key. Any
 * signed-in user without one (Google sign-in, or e-mail sign-up that
 * could not save it) is routed to the completion step. Renders nothing.
 */
export function PayoutOnboardingGate() {
  const { status } = useSession();
  const payout = usePayoutAccount();
  const pathname = usePathname();
  const router = useRouter();

  const missing = status === 'signedIn' && payout.isSuccess && !payout.data;

  useEffect(() => {
    if (missing && pathname !== '/complete-signup' && pathname !== '/auth') {
      router.replace('/complete-signup');
    }
  }, [missing, pathname, router]);

  return null;
}
