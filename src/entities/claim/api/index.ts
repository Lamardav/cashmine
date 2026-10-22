import { request } from '@/shared/api';

export interface ClaimOptions {
  asset: string;
  minAmount: string;
  fee: string;
  destinations: { id: string; label: string }[];
}

export interface Claim {
  id: string;
  asset: string;
  amount: string;
  fee: string;
  receiveAmount: string;
  destinationId: string;
  status: 'pending' | 'completed' | 'failed';
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimBody {
  asset: string;
  amount: string;
  destinationId: string;
}

export const getClaimOptions = (asset: string) =>
  request<ClaimOptions>(`/v1/claim-options?asset=${encodeURIComponent(asset)}`);

export const getClaim = (id: string) => request<Claim>(`/v1/claims/${encodeURIComponent(id)}`);

/** Same key + same body is safe to repeat: the server returns the original claim. */
export const createClaim = (body: CreateClaimBody, idempotencyKey: string) =>
  request<Claim>('/v1/claims', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
