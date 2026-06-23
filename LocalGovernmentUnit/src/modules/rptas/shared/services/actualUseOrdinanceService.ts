import api from './api';

export interface ActualUseOrdinance {
  id: string;
  municipality_code: string;
  class_level: string;
  ordinance_no: string;
  date_approved: string;
  created_at: string;
  updated_at: string;
}

export const getActualUseOrdinances = async (
  params?: { municipalityCode?: string; classLevel?: string },
  options?: { signal?: AbortSignal }
): Promise<ActualUseOrdinance[]> => {
  const response = await api.get('/actualuse-ordinances', { params, signal: options?.signal });
  return response.data.data || [];
};

export const upsertActualUseOrdinance = async (
  municipalityCode: string,
  classLevel: string,
  ordinanceNo: string,
  dateApproved: string
): Promise<ActualUseOrdinance> => {
  const response = await api.post('/actualuse-ordinances', {
    municipalityCode,
    classLevel,
    ordinanceNo,
    dateApproved,
  });
  return response.data.data;
};
