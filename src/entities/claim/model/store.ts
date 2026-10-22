import { create } from 'zustand';
import { KEYS, load, save } from '@/shared/lib/storage';
import type { Claim } from '../api';

/** Claims created on this device. Persisted so a reload keeps following them. */
export type TrackedClaim = Claim;

interface ClaimState {
  claims: TrackedClaim[];
  upsert(c: Claim): void;
  reset(): void;
}

const MAX_TRACKED = 20;

export const useClaimStore = create<ClaimState>((set) => ({
  claims: load<TrackedClaim[]>(KEYS.trackedClaims, []),
  upsert(c) {
    set((s) => {
      const claims = [c, ...s.claims.filter((p) => p.id !== c.id)].slice(0, MAX_TRACKED);
      save(KEYS.trackedClaims, claims);
      return { claims };
    });
  },
  reset() {
    save(KEYS.trackedClaims, null);
    set({ claims: [] });
  },
}));
