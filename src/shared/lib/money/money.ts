// Amounts are kept as bigint counts of the asset's smallest unit (10^-decimals).
// We never use JS numbers for money: floats can't represent 0.1 exactly and
// lose precision past 2^53 (an 18-decimal ETH amount overflows that quickly).

export type Units = bigint;

const API_AMOUNT_RE = /^(0|[1-9]\d*)(\.\d+)?$/;

/** Strict parse of an amount string coming from the API (e.g. "0.0005"). */
export function parseApiAmount(value: string, decimals: number): Units {
  // Balances can be negative in theory (not documented); accept a leading minus.
  const negative = value.startsWith('-');
  const body = negative ? value.slice(1) : value;
  if (!API_AMOUNT_RE.test(body)) throw new Error(`Invalid amount from API: "${value}"`);
  const [int, frac = ''] = body.split('.');
  if (frac.length > decimals) throw new Error(`Too many decimals in "${value}" (max ${decimals})`);
  const units = BigInt(int + frac.padEnd(decimals, '0'));
  return negative ? -units : units;
}

/** Parse a decimal string with any number of decimals into units at `decimals`, or null. */
export function parseDecimal(value: string): { units: bigint; scale: number } | null {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!m) return null;
  const frac = m[3] ?? '';
  const units = BigInt(m[2] + frac);
  return { units: m[1] ? -units : units, scale: frac.length };
}

/** Format units as a canonical API string: no trailing zeros, no leading zeros, no trailing dot. */
export function formatUnits(units: Units, decimals: number): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const s = abs.toString().padStart(decimals + 1, '0');
  const int = s.slice(0, s.length - decimals);
  const frac = decimals > 0 ? s.slice(s.length - decimals).replace(/0+$/, '') : '';
  return (negative ? '-' : '') + (frac ? `${int}.${frac}` : int);
}

export type ParseInputResult =
  | { ok: true; units: Units; canonical: string }
  | { ok: false; error: string };

/**
 * Parse what the user typed. We are lenient about harmless formatting
 * (comma as decimal separator, ".5", "1.", leading zeros, spaces) and always
 * send the canonical form, because the API rejects ".5", "1.", "05".
 * We are strict about anything ambiguous: signs, exponents, letters, and
 * more decimals than the asset allows (we never silently round money).
 */
export function parseUserAmount(input: string, decimals: number): ParseInputResult {
  const s = input.trim().replace(',', '.');
  if (s === '') return { ok: false, error: 'Enter an amount' };
  if (!/^\d*\.?\d*$/.test(s) || s === '.') return { ok: false, error: 'Use digits and one decimal point' };
  const [intRaw, fracRaw = ''] = s.split('.');
  if (fracRaw.length > decimals) {
    return { ok: false, error: `At most ${decimals} decimal places` };
  }
  const units = BigInt((intRaw || '0') + fracRaw.padEnd(decimals, '0'));
  return { ok: true, units, canonical: formatUnits(units, decimals) };
}

export interface ClaimRules {
  decimals: number;
  available: Units;
  minAmount: Units;
  fee: Units;
}

export type ValidateResult =
  | { ok: true; amount: Units; canonical: string; fee: Units; receive: Units }
  | { ok: false; error: string };

/** Validate a user-entered claim amount against the API rules. */
export function validateClaimAmount(input: string, rules: ClaimRules): ValidateResult {
  const parsed = parseUserAmount(input, rules.decimals);
  if (!parsed.ok) return parsed;
  const { units } = parsed;
  if (units <= 0n) return { ok: false, error: 'Amount must be greater than 0' };
  if (units < rules.minAmount) {
    return { ok: false, error: `Minimum is ${formatUnits(rules.minAmount, rules.decimals)}` };
  }
  if (units > rules.available) {
    return { ok: false, error: `Only ${formatUnits(rules.available, rules.decimals)} available` };
  }
  const receive = units - rules.fee;
  if (receive <= 0n) {
    return { ok: false, error: `Amount must be more than the fee (${formatUnits(rules.fee, rules.decimals)})` };
  }
  return { ok: true, amount: units, canonical: parsed.canonical, fee: rules.fee, receive };
}

// ---- USD ----

/** USD values are kept in this fixed scale (10^-12 USD) so sums stay exact until display. */
export const USD_SCALE = 12;

/** amount (units at `decimals`) * usdPrice (decimal string) -> USD at USD_SCALE, truncated. */
export function toUsd(units: Units, decimals: number, usdPrice: string): bigint {
  const price = parseDecimal(usdPrice);
  if (!price) throw new Error(`Invalid usdPrice "${usdPrice}"`);
  const product = units * price.units; // scale = decimals + price.scale
  const scale = decimals + price.scale;
  return rescale(product, scale, USD_SCALE);
}

function rescale(value: bigint, from: number, to: number): bigint {
  if (from === to) return value;
  if (from < to) return value * 10n ** BigInt(to - from);
  return value / 10n ** BigInt(from - to); // truncates toward zero
}

/** Format USD (at USD_SCALE) as "$1,234.56", rounded half-up to cents. */
export function formatUsd(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const centsDivisor = 10n ** BigInt(USD_SCALE - 2);
  const cents = (abs + centsDivisor / 2n) / centsDivisor;
  const dollars = cents / 100n;
  const rem = (cents % 100n).toString().padStart(2, '0');
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${grouped}.${rem}`;
}
