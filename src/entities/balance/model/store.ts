import { create } from 'zustand';
import { ApiError, toApiError } from '@/shared/api';
import { getBalances, type Balances } from '../api';
import { isNewer } from './applyClaims';

interface BalanceState {
  snapshot: Balances | null;
  error: ApiError | null;
  loading: boolean;
  refresh(): Promise<void>;
  reset(): void;
}

let inflight: Promise<void> | null = null;
let generation = 0; // bumped on reset so a response for an old token is dropped

export const useBalanceStore = create<BalanceState>((set) => ({
  snapshot: null,
  error: null,
  loading: false,
  refresh() {
    if (inflight) return inflight;
    const gen = generation;
    set({ loading: true });
    inflight = (async () => {
      try {
        const next = await getBalances();
        if (gen !== generation) return;
        // Responses can arrive out of order; never replace a newer snapshot with an older one.
        set((s) => ({ snapshot: isNewer(next, s.snapshot) ? next : s.snapshot, error: null }));
      } catch (e) {
        if (gen !== generation) return;
        set({ error: toApiError(e) });
      } finally {
        if (gen === generation) set({ loading: false });
        inflight = null;
      }
    })();
    return inflight;
  },
  reset() {
    generation++;
    inflight = null;
    set({ snapshot: null, error: null, loading: false });
  },
}));
