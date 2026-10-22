import { request } from '@/shared/api';

export interface ActivityItem {
  id: string;
  type: 'accrual' | 'reversal' | 'claim';
  asset: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'completed' | 'failed';
  exchange: string | null;
  createdAt: string;
  relatedId: string | null;
}

export interface ActivityPage {
  items: ActivityItem[];
  nextCursor: string | null;
}

export const getActivity = (cursor?: string | null) =>
  request<ActivityPage>(`/v1/activity?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
