import { describe, expect, it } from 'vitest';
import {
  formatUnits,
  formatUsd,
  parseApiAmount,
  parseUserAmount,
  toUsd,
  validateClaimAmount,
} from './money';

describe('parseApiAmount / formatUnits', () => {
  it('round-trips API strings', () => {
    for (const s of ['0', '0.5', '12', '820.413207', '0.000001']) {
      expect(formatUnits(parseApiAmount(s, 6), 6)).toBe(s);
    }
  });
  it('handles 18 decimals without precision loss', () => {
    const u = parseApiAmount('123456789.123456789012345678', 18);
    expect(u).toBe(123456789123456789012345678n);
    expect(formatUnits(u, 18)).toBe('123456789.123456789012345678');
  });
  it('rejects malformed API amounts', () => {
    for (const s of ['.5', '1.', '05', '1e-3', 'abc', '']) {
      expect(() => parseApiAmount(s, 6)).toThrow();
    }
    expect(() => parseApiAmount('0.0000001', 6)).toThrow();
  });
});

describe('parseUserAmount', () => {
  it('normalizes harmless formatting to canonical API form', () => {
    expect(parseUserAmount('.5', 8)).toMatchObject({ ok: true, canonical: '0.5' });
    expect(parseUserAmount('1.', 8)).toMatchObject({ ok: true, canonical: '1' });
    expect(parseUserAmount('005', 8)).toMatchObject({ ok: true, canonical: '5' });
    expect(parseUserAmount(' 0,25 ', 8)).toMatchObject({ ok: true, canonical: '0.25' });
    expect(parseUserAmount('1.50', 8)).toMatchObject({ ok: true, canonical: '1.5', units: 150000000n });
  });
  it('rejects ambiguous input instead of guessing', () => {
    for (const s of ['', '.', '-1', '1e-3', '1.2.3', 'abc', '+1', '1 000']) {
      expect(parseUserAmount(s, 8).ok).toBe(false);
    }
  });
  it('rejects too many decimals instead of rounding', () => {
    expect(parseUserAmount('0.1234567', 6)).toEqual({ ok: false, error: 'At most 6 decimal places' });
    expect(parseUserAmount('0.123456', 6).ok).toBe(true);
  });
});

describe('validateClaimAmount', () => {
  // ETH-like: 18 decimals, min 0.01, fee 0.0012, available 1.5
  const rules = {
    decimals: 18,
    available: parseApiAmount('1.5', 18),
    minAmount: parseApiAmount('0.01', 18),
    fee: parseApiAmount('0.0012', 18),
  };
  it('computes fee and receive amount exactly', () => {
    const r = validateClaimAmount('0.5', rules);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(formatUnits(r.receive, 18)).toBe('0.4988');
      expect(r.receive + r.fee).toBe(r.amount);
    }
  });
  it('accepts exactly min and exactly available (Max)', () => {
    expect(validateClaimAmount('0.01', rules).ok).toBe(true);
    expect(validateClaimAmount('1.5', rules).ok).toBe(true);
  });
  it('rejects below min, above available, and zero', () => {
    expect(validateClaimAmount('0.0099', rules)).toEqual({ ok: false, error: 'Minimum is 0.01' });
    expect(validateClaimAmount('1.500000000000000001', rules)).toEqual({ ok: false, error: 'Only 1.5 available' });
    expect(validateClaimAmount('0', rules).ok).toBe(false);
  });
  it('rejects amounts that would not cover the fee', () => {
    const r = validateClaimAmount('0.001', { ...rules, minAmount: 0n });
    expect(r.ok).toBe(false);
  });
});

describe('USD', () => {
  it('multiplies amount by price exactly', () => {
    // 820.413207 USDT * 1.0002 = 820.5772896414
    const usd = toUsd(parseApiAmount('820.413207', 6), 6, '1.0002');
    expect(formatUsd(usd)).toBe('$820.58');
  });
  it('sums across assets before rounding', () => {
    // three times $0.004 each is $0.012 -> rounds to $0.01, not 3 x $0.00
    const one = toUsd(parseApiAmount('0.004', 6), 6, '1');
    expect(formatUsd(one * 3n)).toBe('$0.01');
  });
  it('formats with grouping and half-up cents', () => {
    expect(formatUsd(toUsd(parseApiAmount('1234567.005', 6), 6, '1'))).toBe('$1,234,567.01');
    expect(formatUsd(0n)).toBe('$0.00');
  });
  it('handles 18-decimal assets with high prices', () => {
    const usd = toUsd(parseApiAmount('2.000000000000000001', 18), 18, '3456.78');
    expect(formatUsd(usd)).toBe('$6,913.56');
  });
});
