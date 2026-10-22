import { create } from 'zustand';
import { ApiError, newIdempotencyKey, toApiError } from '@/shared/api';
import { KEYS, load, save } from '@/shared/lib/storage';
import { useBalanceStore } from '@/entities/balance';
import { createClaim, useClaimStore, type Claim, type CreateClaimBody } from '@/entities/claim';

/**
 * A claim POST whose outcome is not settled yet.
 *
 * The Idempotency-Key is created once, when the user confirms, and persisted
 * with the exact body. Every retry (automatic, manual, or after a reload) sends
 * the same key and body, so the server returns the original claim instead of
 * creating a second one.
 */
export interface Submission {
  key: string;
  body: CreateClaimBody;
  phase: 'sending' | 'retrying' | 'unknown' | 'rejected';
  attempt: number;
  message?: string;
  field?: string;
}

const MAX_AUTO_ATTEMPTS = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SubmissionState {
  submission: Submission | null;
  /** Start a new claim. Refuses while another submission is still open. */
  submit(body: CreateClaimBody): Promise<Claim | null>;
  /** Re-send the open submission with the same key. Never creates a new claim. */
  retry(): Promise<Claim | null>;
  /** Only allowed once the outcome is known (rejected). */
  dismiss(): void;
  reset(): void;
}

type Persisted = { key: string; body: CreateClaimBody } | null;

function restore(): Submission | null {
  const p = load<Persisted>(KEYS.submission, null);
  // Persisted means the app closed mid-request: we don't know if the claim exists.
  return p ? { ...p, phase: 'unknown', attempt: 0, message: 'Checking whether your last claim went through…' } : null;
}

let running = false;
let generation = 0;

export const useSubmissionStore = create<SubmissionState>((set, get) => {
  const update = (s: Submission | null) => {
    save(KEYS.submission, s && s.phase !== 'rejected' ? { key: s.key, body: s.body } : null);
    set({ submission: s });
  };

  async function run(key: string, body: CreateClaimBody): Promise<Claim | null> {
    if (running) return null;
    running = true;
    const gen = generation;
    try {
      for (let attempt = 1; attempt <= MAX_AUTO_ATTEMPTS; attempt++) {
        if (gen !== generation) return null;
        update({ key, body, attempt, phase: attempt === 1 ? 'sending' : 'retrying', message: get().submission?.message });
        try {
          const claim = await createClaim(body, key);
          if (gen !== generation) return null;
          useClaimStore.getState().upsert(claim);
          update(null);
          useBalanceStore.getState().refresh();
          return claim;
        } catch (e) {
          if (gen !== generation) return null;
          const err = toApiError(e);
          if (!err.retryable) {
            // 400/401/404/409: the server answered and did not create a claim.
            update({ key, body, attempt, phase: 'rejected', message: err.message, field: err.field });
            return null;
          }
          if (attempt === MAX_AUTO_ATTEMPTS) break;
          update({ key, body, attempt, phase: 'retrying', message: describe(err) });
          await sleep(err.retryAfterMs ?? Math.min(1000 * 2 ** (attempt - 1), 8000));
        }
      }
      update({
        key,
        body,
        attempt: MAX_AUTO_ATTEMPTS,
        phase: 'unknown',
        message: "We couldn't confirm whether your claim was created.",
      });
      return null;
    } finally {
      running = false;
    }
  }

  return {
    submission: restore(),
    submit(body) {
      const open = get().submission;
      if (open && open.phase !== 'rejected') return Promise.resolve(null);
      return run(newIdempotencyKey(), body);
    },
    retry() {
      const s = get().submission;
      return s ? run(s.key, s.body) : Promise.resolve(null);
    },
    dismiss() {
      if (get().submission?.phase === 'rejected') update(null);
    },
    reset() {
      generation++;
      running = false;
      update(null);
    },
  };
});

function describe(err: ApiError) {
  if (err.kind === 'rate_limited') return 'The server is busy. Retrying shortly…';
  if (err.kind === 'unknown_outcome') return 'No answer from the server yet. Checking again with the same request…';
  return 'Temporary server error. Retrying…';
}
