import { useEffect } from 'react';
import { CLAIM_POLL_MS } from '@/shared/config';
import { useBalanceStore } from '@/entities/balance';
import { getClaim, useClaimStore } from '@/entities/claim';

/** Poll every pending claim created on this device until it completes or fails. */
export function useClaimTracking(enabled: boolean) {
  const pendingIds = useClaimStore((s) =>
    s.claims
      .filter((c) => c.status === 'pending')
      .map((c) => c.id)
      .join(','),
  );

  useEffect(() => {
    if (!enabled || !pendingIds) return;
    let stopped = false;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        for (const id of pendingIds.split(',')) {
          try {
            const c = await getClaim(id);
            if (stopped) return;
            useClaimStore.getState().upsert(c);
            // A settled claim changes available/claiming; fetch the new snapshot.
            if (c.status !== 'pending') useBalanceStore.getState().refresh();
          } catch {
            // transient errors are expected; keep polling
          }
        }
      } finally {
        busy = false;
      }
    };
    tick();
    const t = setInterval(tick, CLAIM_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [enabled, pendingIds]);
}
