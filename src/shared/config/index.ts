// The only place the API base URL is defined.
export const API_BASE_URL = 'https://task-api.cashmine.io';

/** Client-side timeout for a single request. After this the outcome is unknown. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Balances are recomputed server-side every 15s; poll at the same cadence. */
export const BALANCES_POLL_MS = 15_000;

export const CLAIM_POLL_MS = 2_000;
