import { useEffect } from 'react';
import { BALANCES_POLL_MS } from '@/shared/config';
import { useBalanceStore } from './store';

/** Fetch balances now and then every 15s (the server's snapshot cadence) while `enabled`. */
export function useBalancesPolling(enabled: boolean) {
  const refresh = useBalanceStore((s) => s.refresh);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, BALANCES_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);
}
