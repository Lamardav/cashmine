// Thin wrapper over localStorage (the app ships as web only).
// Every access is guarded: storage can be blocked (private mode, disabled cookies).

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value === undefined || value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: we still work for this session, just without persistence
  }
}

export const KEYS = {
  token: 'cashmine.token',
  trackedClaims: 'cashmine.trackedClaims',
  submission: 'cashmine.claimSubmission',
} as const;
