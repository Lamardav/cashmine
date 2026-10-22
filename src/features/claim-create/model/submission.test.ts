import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api';

const createClaim = vi.fn();
const upsert = vi.fn();
vi.mock('@/entities/claim', () => ({
  createClaim: (...a: unknown[]) => createClaim(...a),
  useClaimStore: { getState: () => ({ upsert }) },
}));
vi.mock('@/entities/balance', () => ({
  useBalanceStore: { getState: () => ({ refresh: vi.fn() }) },
}));

const { useSubmissionStore } = await import('./submission');

const body = { asset: 'USDT', amount: '10', destinationId: 'dest_wallet' };
const claim = { id: 'clm_1', ...body, fee: '1.5', receiveAmount: '8.5', status: 'pending' };

describe('claim submission', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createClaim.mockReset();
    upsert.mockReset();
    useSubmissionStore.getState().reset();
  });

  it('retries a timed-out request with the same Idempotency-Key and body', async () => {
    createClaim
      .mockRejectedValueOnce(new ApiError('unknown_outcome', 'timeout', 504))
      .mockRejectedValueOnce(new ApiError('rate_limited', 'slow down', 429, undefined, 500))
      .mockResolvedValueOnce(claim);
    const p = useSubmissionStore.getState().submit(body);
    await vi.runAllTimersAsync();
    await expect(p).resolves.toEqual(claim);
    expect(createClaim).toHaveBeenCalledTimes(3);
    const keys = createClaim.mock.calls.map((c) => c[1]);
    expect(new Set(keys).size).toBe(1);
    expect(createClaim.mock.calls.every((c) => c[0] === body)).toBe(true);
    expect(useSubmissionStore.getState().submission).toBeNull();
  });

  it('stops on a validation error and lets the user start over', async () => {
    createClaim.mockRejectedValueOnce(new ApiError('validation', 'Amount exceeds the available balance', 400, 'amount'));
    await useSubmissionStore.getState().submit(body);
    expect(createClaim).toHaveBeenCalledTimes(1);
    expect(useSubmissionStore.getState().submission).toMatchObject({ phase: 'rejected', field: 'amount' });
  });

  it('after retries run out, the outcome is unknown and a new claim is refused', async () => {
    createClaim.mockRejectedValue(new ApiError('unknown_outcome', 'timeout', 504));
    const p = useSubmissionStore.getState().submit(body);
    await vi.runAllTimersAsync();
    await p;
    const s = useSubmissionStore.getState().submission!;
    expect(s.phase).toBe('unknown');
    createClaim.mockClear();
    await expect(useSubmissionStore.getState().submit({ ...body, amount: '20' })).resolves.toBeNull();
    expect(createClaim).not.toHaveBeenCalled();

    // "Check again" re-sends the original request, not a new one.
    createClaim.mockResolvedValueOnce(claim);
    await useSubmissionStore.getState().retry();
    expect(createClaim.mock.calls[0]).toEqual([body, s.key]);
  });
});
