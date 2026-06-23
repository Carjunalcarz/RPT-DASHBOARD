import api from '@/modules/rptas/shared/services/api';
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

  update: async (id: string, payload: Omit<Payor, 'id'>) => {
    const res = await api.put<ApiResponse<Payor>>(`/payors/${id}`, payload);
    return res.data;
  },

  bulkCreate: async (rows: Array<Omit<Payor, 'id'>>) => {
    const res = await api.post<PayorBulkResult>('/payors/bulk', { rows });
    return res.data;
  },

  // Uploads a valid-ID proof image via the backend (service-role storage write).
  uploadIdImage: async (file: File) => {
    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    const res = await api.post<{ success: boolean; url?: string; path?: string }>('/payors/id-image', {
      fileBase64,
      fileName: file.name,
      contentType: file.type,
    });
    return res.data;
  },

  // Short-lived signed URL for viewing a stored ID image (works for private buckets).
  getIdImageSignedUrl: async (path: string) => {
    const res = await api.get<{ success: boolean; url?: string }>('/payors/id-image/signed-url', {
      params: { path },
    });
    return res.data;
  },
};

export default payorService;
