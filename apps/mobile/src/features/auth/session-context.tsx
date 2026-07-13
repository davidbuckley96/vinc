import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { firstName } from '@vinc/core';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type SessionStatus =
  /** Waiting for the persisted session to load. */
  | 'loading'
  /** Supabase env vars absent — demo mode, no real auth (docs/07 #14). */
  | 'unconfigured'
  | 'signedOut'
  | 'signedIn';

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  /** Display name from the profile metadata, when signed in. */
  userName: string | null;
}

const SessionContext = createContext<SessionState>({
  status: 'loading',
  session: null,
  userName: null,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() =>
    isSupabaseConfigured
      ? { status: 'loading', session: null, userName: null }
      : { status: 'unconfigured', session: null, userName: null },
  );

  useEffect(() => {
    if (!supabase) return;

    const apply = (session: Session | null) =>
      setState({
        status: session ? 'signedIn' : 'signedOut',
        session,
        userName:
          firstName(session?.user.user_metadata?.name as string | undefined) ||
          session?.user.email ||
          null,
      });

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session),
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
