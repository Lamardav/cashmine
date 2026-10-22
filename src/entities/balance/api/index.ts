import { request } from '@/shared/api';

export interface BalanceItem {
  asset: string;
  decimals: number;
  available: string;
  pending: string;
  claiming: string;
  usdPrice: string;
}

export interface Balances {
  asOf: string;
  items: BalanceItem[];
}

export const getBalances = () => request<Balances>('/v1/balances');
