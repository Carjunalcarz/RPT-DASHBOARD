import api from '@/services/api';
import type { Payor } from '@/types/payor';

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export type PayorBulkResult = {
  success: boolean;
  created: Payor[];
  duplicates: Array<{ index: number; key: string }>;
  failed: Array<{ index: number; error: string }>;
};

const payorService = {
  search: async (q: string, limit = 10) => {
    const res = await api.get<ApiResponse<Payor[]>>('/payors/search', { params: { q, limit, _ts: Date.now() } });
    return res.data;
  },

  create: async (payload: Omit<Payor, 'id'>) => {
    const res = await api.post<ApiResponse<Payor>>('/payors', payload);
    return res.data;
  },

  bulkCreate: async (rows: Array<Omit<Payor, 'id'>>) => {
    const res = await api.post<PayorBulkResult>('/payors/bulk', { rows });
    return res.data;
  },
};

export default payorService;
