import React, { useEffect } from 'react';
import { useBalanceStore, useBalancesPolling } from '@/entities/balance';
import { useClaimStore } from '@/entities/claim';
import { useSessionStore } from '@/entities/session';
import { useSubmissionStore } from '@/features/claim-create';
import { useClaimTracking } from '@/features/claim-track';
import { TokenPage } from '@/pages/token';

// Switching token means switching user: drop everything cached for the previous one.
useSessionStore.subscribe((state, prev) => {
  if (state.token === prev.token) return;
  useSubmissionStore.getState().reset();
  useClaimStore.getState().reset();
  useBalanceStore.getState().reset();
});

/** Background work for a signed-in user, and the token gate. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((st) => st.token);
  const signedIn = !!token;

  useBalancesPolling(signedIn);
  useClaimTracking(signedIn);

  // The app was closed while a claim request was unresolved: re-send it with the same key.
  useEffect(() => {
    const s = useSubmissionStore.getState().submission;
    if (signedIn && s?.phase === 'unknown' && s.attempt === 0) useSubmissionStore.getState().retry();
  }, [signedIn]);

  return signedIn ? <>{children}</> : <TokenPage />;
}
