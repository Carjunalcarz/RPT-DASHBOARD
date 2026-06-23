import api from './api';

export interface ClassificationRate {
  id: string;
  code: string;
  name: string;
  rate: number | null;
  created_at: string;
  updated_at: string;
}

export const getClassificationRates = async (): Promise<ClassificationRate[]> => {
  const response = await api.get('/classification-rates');
  return response.data.data || [];
};

export const upsertClassificationRate = async (
  code: string,
  name: string,
  rate: number | null
): Promise<ClassificationRate> => {
  const response = await api.post('/classification-rates', {
    code,
    name,
    rate,
  });
  return response.data.data;
};

export const deleteClassificationRate = async (id: string): Promise<void> => {
  await api.delete(`/classification-rates/${id}`);
};

