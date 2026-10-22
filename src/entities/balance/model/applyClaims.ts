import type { BalanceItem, Balances, Claim } from './api';
import { parseApiAmount, toUsd, type Units } from './money';

/** A claim this device created, kept so the balance can reflect it before the next snapshot. */
export interface TrackedClaim {
  id: string;
  asset: string;
  amount: string;
  status: Claim['status'];
  createdAt: string;
  failureReason: string | null;
}

export interface AssetBalance {
  asset: string;
  decimals: number;
  usdPrice: string;
  available: Units;
  pending: Units;
  claiming: Units;
  /** True when local claims were applied on top of the server snapshot. */
  adjusted: boolean;
}

/**
 * Snapshot + our own claims that the snapshot does not include yet.
 *
 * The server deducts `available` the moment a claim is created, but the
 * balances snapshot is recomputed only every 15s. A snapshot whose `asOf` is
 * after the claim's `createdAt` already contains the claim, so we stop
 * adjusting it; until then we move the amount from available to claiming
 * ourselves. Because the switch is driven by `asOf`, a stale snapshot can never
 * make the balance jump back up, and a fresh one never double-counts.
 *
 * Failed claims are not applied: their amount is back in available.
 * Equal timestamps are treated as "not included" (conservative: show less available).
 */
export function applyClaims(snapshot: Balances, claims: TrackedClaim[]): AssetBalance[] {
  const asOf = Date.parse(snapshot.asOf);
  return snapshot.items.map((item) => {
    const base = fromItem(item);
    for (const c of claims) {
      if (c.asset !== item.asset || c.status === 'failed') continue;
      if (asOf > Date.parse(c.createdAt)) continue; // snapshot already includes it
      const amount = parseApiAmount(c.amount, item.decimals);
      base.available -= amount;
      if (c.status === 'pending') base.claiming += amount;
      base.adjusted = true;
    }
    if (base.available < 0n) base.available = 0n;
    return base;
  });
}

function fromItem(item: BalanceItem): AssetBalance {
  return {
    asset: item.asset,
    decimals: item.decimals,
    usdPrice: item.usdPrice,
    available: parseApiAmount(item.available, item.decimals),
    pending: parseApiAmount(item.pending, item.decimals),
    claiming: parseApiAmount(item.claiming, item.decimals),
    adjusted: false,
  };
}

export function usdOf(b: AssetBalance, field: 'available' | 'pending' | 'claiming' | 'total'): bigint {
  const units = field === 'total' ? b.available + b.pending + b.claiming : b[field];
  return toUsd(units, b.decimals, b.usdPrice);
}

export function sumUsd(items: AssetBalance[], field: 'available' | 'pending' | 'claiming' | 'total'): bigint {
  return items.reduce((acc, b) => acc + usdOf(b, field), 0n);
}

/** Never let an older snapshot replace a newer one (responses can arrive out of order). */
export function isNewer(next: Balances, current: Balances | null): boolean {
  return !current || Date.parse(next.asOf) >= Date.parse(current.asOf);
}
