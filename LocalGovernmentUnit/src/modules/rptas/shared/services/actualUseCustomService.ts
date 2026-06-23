import api from './api';

export interface CustomActualUse {
  id: string;
  mainclass_code: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const getCustomActualUses = async (params?: { search?: string; mainClass?: string }): Promise<CustomActualUse[]> => {
  const response = await api.get('/actual-uses/custom', { params });
  return response.data.data || [];
};

export const upsertCustomActualUse = async (
  mainClassCode: string,
  code: string,
  description: string
): Promise<CustomActualUse> => {
  const response = await api.post('/actual-uses/custom', {
    mainClassCode,
    code,
    description,
  });
  return response.data.data;
};

export const deleteCustomActualUse = async (id: string): Promise<void> => {
  await api.delete(`/actual-uses/custom/${encodeURIComponent(id)}`);
};
