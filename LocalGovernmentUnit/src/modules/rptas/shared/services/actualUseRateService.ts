import api from './api';

export interface ActualUseRate {
  id: string;
  municipality_code: string;
  class_level: string;
  ordinance_no: string;
  mainclass_code: string;
  actualuse_code: string;
  actualuse_name: string;
  rate: number | null;
  created_at: string;
  updated_at: string;
}

export const getActualUseRates = async (params?: {
  municipalityCode?: string;
  classLevel?: string;
  ordinanceNo?: string;
  mainClassCode?: string;
}): Promise<ActualUseRate[]> => {
  const response = await api.get('/actual-use-rates', { params });
  return response.data.data || [];
};

export const upsertActualUseRate = async (
  municipalityCode: string,
  classLevel: string,
  ordinanceNo: string,
  mainClassCode: string,
  actualUseCode: string,
  actualUseName: string,
  rate: number | null
): Promise<ActualUseRate> => {
  const response = await api.post('/actual-use-rates', {
    municipalityCode,
    classLevel,
    ordinanceNo,
    mainClassCode,
    actualUseCode,
    actualUseName,
    rate,
  });
  return response.data.data;
};

export const deleteActualUseRate = async (id: string): Promise<void> => {
  await api.delete(`/actual-use-rates/${id}`);
};
