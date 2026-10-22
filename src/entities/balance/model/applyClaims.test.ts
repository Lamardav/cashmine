import { describe, expect, it } from 'vitest';
import type { Balances } from './api';
import { applyClaims, isNewer, sumUsd, type TrackedClaim } from './balances';
import { formatUnits, formatUsd } from './money';

const snapshot = (asOf: string, available: string, claiming = '0'): Balances => ({
  asOf,
  items: [{ asset: 'ETH', decimals: 18, available, pending: '0.1', claiming, usdPrice: '2000' }],
});

const claim = (over: Partial<TrackedClaim> = {}): TrackedClaim => ({
  id: 'clm_1',
  asset: 'ETH',
  amount: '0.5',
  status: 'pending',
  createdAt: '2026-10-22T15:00:10.000Z',
  failureReason: null,
  ...over,
});

describe('applyClaims', () => {
  it('moves a new claim from available to claiming while the snapshot predates it', () => {
    const [b] = applyClaims(snapshot('2026-10-22T15:00:00.000Z', '1.5'), [claim()]);
    expect(formatUnits(b.available, 18)).toBe('1');
    expect(formatUnits(b.claiming, 18)).toBe('0.5');
    expect(b.adjusted).toBe(true);
  });
  it('does not double count once the snapshot includes the claim', () => {
    const [b] = applyClaims(snapshot('2026-10-22T15:00:15.000Z', '1', '0.5'), [claim()]);
    expect(formatUnits(b.available, 18)).toBe('1');
    expect(formatUnits(b.claiming, 18)).toBe('0.5');
    expect(b.adjusted).toBe(false);
  });
  it('ignores failed claims (the amount is back in available)', () => {
    const [b] = applyClaims(snapshot('2026-10-22T15:00:00.000Z', '1.5'), [claim({ status: 'failed' })]);
    expect(formatUnits(b.available, 18)).toBe('1.5');
  });
  it('completed claim before the next snapshot leaves available only', () => {
    const [b] = applyClaims(snapshot('2026-10-22T15:00:00.000Z', '1.5'), [claim({ status: 'completed' })]);
    expect(formatUnits(b.available, 18)).toBe('1');
    expect(formatUnits(b.claiming, 18)).toBe('0');
  });
  it('sums totals in USD', () => {
    const items = applyClaims(snapshot('2026-10-22T15:00:00.000Z', '1.5'), [claim()]);
    expect(formatUsd(sumUsd(items, 'available'))).toBe('$2,000.00');
    expect(formatUsd(sumUsd(items, 'total'))).toBe('$3,200.00');
  });
});

describe('isNewer', () => {
  it('rejects out-of-order older snapshots', () => {
    const a = snapshot('2026-10-22T15:00:15.000Z', '1');
    const b = snapshot('2026-10-22T15:00:00.000Z', '1.5');
    expect(isNewer(b, a)).toBe(false);
    expect(isNewer(a, b)).toBe(true);
    expect(isNewer(a, null)).toBe(true);
  });
});
