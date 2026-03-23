import api from './api';
import type { OrderOfPayment, OopHistory } from '@/types/oop';

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export type PendingOrdersResponse = {
  success: boolean;
  data: OrderOfPayment[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const oopService = {
  create: async (payload: { amount: number; description?: string } & Record<string, unknown>) => {
    const res = await api.post<ApiResponse<OrderOfPayment>>('/oop', payload);
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<ApiResponse<OrderOfPayment>>(`/oop/${id}`);
    return res.data;
  },

  update: async (id: string, payload: { amount?: number; description?: string }) => {
    const res = await api.patch<ApiResponse<OrderOfPayment>>(`/oop/${id}`, payload);
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.post<ApiResponse<OrderOfPayment>>(`/oop/${id}/cancel`, {});
    return res.data;
  },

  markPaid: async (id: string) => {
    const res = await api.post<ApiResponse<OrderOfPayment>>(`/oop/${id}/pay`, {});
    return res.data;
  },

  listPending: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<PendingOrdersResponse>('/oop/pending', { params });
    return res.data;
  },

  history: async (id: string) => {
    const res = await api.get<ApiResponse<{ order: OrderOfPayment; history: OopHistory[] }>>(`/oop/${id}/history`);
    return res.data;
  },
};

export default oopService;
