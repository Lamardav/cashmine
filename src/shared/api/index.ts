import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/shared/config';

export type ApiErrorKind =
  | 'validation' // 400: definitive, request was rejected
  | 'unauthorized' // 401
  | 'not_found' // 404
  | 'conflict' // 409 idempotency mismatch
  | 'rate_limited' // 429: not processed, retry later
  | 'server' // 500/503: temporary
  | 'unknown_outcome'; // 504, client timeout, network failure: may or may not have happened

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
    public field?: string,
    public retryAfterMs?: number,
  ) {
    super(message);
  }
  /** True when retrying the identical request may succeed. */
  get retryable() {
    return this.kind === 'rate_limited' || this.kind === 'server' || this.kind === 'unknown_outcome';
  }
}

let authToken: string | null = null;
/** Set by the session entity; shared must not import entities. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${authToken ?? ''}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('unknown_outcome', 'Network error or timeout. We could not reach the server.');
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return (await res.json()) as T;

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error body
  }
  const err = body?.error ?? {};
  const message: string = err.message ?? `HTTP ${res.status}`;
  switch (res.status) {
    case 400:
      throw new ApiError('validation', message, 400, err.field);
    case 401:
      throw new ApiError('unauthorized', 'Your token is missing, invalid or expired.', 401);
    case 404:
      throw new ApiError('not_found', message, 404);
    case 409:
      throw new ApiError('conflict', message, 409);
    case 429: {
      const header = Number(res.headers.get('Retry-After'));
      const retryAfterMs = err.retryAfterMs ?? (Number.isFinite(header) && header > 0 ? header * 1000 : 2000);
      throw new ApiError('rate_limited', 'Too many requests. Please wait a moment.', 429, undefined, retryAfterMs);
    }
    case 504:
      throw new ApiError('unknown_outcome', 'The server did not finish in time.', 504);
    default:
      throw new ApiError('server', res.status >= 500 ? 'Temporary server error.' : message, res.status);
  }
}

export function toApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError('server', 'Something went wrong.');
}

export function newIdempotencyKey(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
