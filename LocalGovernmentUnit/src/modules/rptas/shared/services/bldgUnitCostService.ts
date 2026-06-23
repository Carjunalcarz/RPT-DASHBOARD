import api from '@/modules/rptas/shared/services/api';

export interface BldgUnitCostRecord {
  Region: string;
  Prov: string;
  City: string;
  StrucType: string;
  BldgCode: string;
  UNIT_VALUE: number;
  Eff_Date: string;
  BldgCodeDesc?: string;
}

export interface BldgUnitCostResponse {
  success: boolean;
  data: BldgUnitCostRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)
  ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL).replace('/v1', '')
  : 'http://localhost:3000/api';

const BLDG_UNIT_COSTS_TTL_MS = 5 * 60 * 1000;
const bldgUnitCostsCache = new Map<string, { value: BldgUnitCostResponse; expiresAt: number }>();
const bldgUnitCostsInFlight = new Map<string, Promise<BldgUnitCostResponse>>();

export const getBldgUnitCosts = async (
  params: { page?: number; limit?: number; strucType?: string; bldgCode?: string; city?: string; effDate?: string } = {}
): Promise<BldgUnitCostResponse> => {
  const key = JSON.stringify(params ?? {});
  const now = Date.now();
  const cached = bldgUnitCostsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = bldgUnitCostsInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const response = await api.get(`${API_BASE}/bldg-unit-cost`, { params });
    const value = response.data as BldgUnitCostResponse;
    if (value?.success) {
      bldgUnitCostsCache.set(key, { value, expiresAt: Date.now() + BLDG_UNIT_COSTS_TTL_MS });
    }
    return value;
  })().finally(() => {
    bldgUnitCostsInFlight.delete(key);
  });

  bldgUnitCostsInFlight.set(key, promise);
  return promise;
};

export const getBldgUnitCostLookup = async (strucType: string, bldgCode: string, city?: string): Promise<BldgUnitCostRecord | null> => {
  try {
    const response = await api.get(`${API_BASE}/bldg-unit-cost/lookup`, { params: { strucType, bldgCode, city } });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const getDistinctBldgUnitCostEffDates = async (
  params: { strucType?: string; bldgCode?: string; city?: string } = {}
): Promise<{ success: boolean; data: string[] }> => {
  const response = await api.get(`${API_BASE}/bldg-unit-cost/distinct/eff-dates`, { params });
  return response.data;
};

export type CreateBldgUnitCostSetRequest = {
  ordinanceNo: string;
  ordinanceDate?: string;
  ordinanceText?: string;
  items: Array<{
    city: string;
    strucType: string;
    bldgCode: string;
    bldgCodeDesc?: string | null;
    unitValue: number;
    effDate: string;
  }>;
};

export const createBldgUnitCostSet = async (
  payload: CreateBldgUnitCostSetRequest
): Promise<{ success: boolean; data: { set: any; itemCount: number } }> => {
  const response = await api.post(`${API_BASE}/bldg-unit-cost/sets`, payload);
  return response.data;
};

export const listBldgUnitCostSets = async (
  params: { page?: number; limit?: number; city?: string; ordinanceNo?: string; includeDeleted?: boolean } = {}
) => {
  const response = await api.get(`${API_BASE}/bldg-unit-cost/sets`, { params });
  return response.data as {
    success: boolean;
    data: BldgUnitCostSetRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
};

export type BldgUnitCostSetRecord = {
  id: string;
  ordinance_no: string;
  ordinance_date: string | null;
  ordinance_text: string;
  city: string;
  created_by: string | null;
  created_at: string;
  updated_by?: string | null;
  updated_at?: string | null;
  deleted_by?: string | null;
  deleted_at?: string | null;
};

export type BldgUnitCostSetItemRecord = {
  id: string;
  set_id: string;
  city: string;
  struc_type: string;
  bldg_code: string;
  bldg_code_desc: string | null;
  unit_value: number;
  eff_date: string;
  created_at: string;
  updated_by?: string | null;
  updated_at?: string | null;
  deleted_by?: string | null;
  deleted_at?: string | null;
};

export const getBldgUnitCostSetById = async (
  id: string,
  params: { includeDeleted?: boolean } = {}
): Promise<{ success: boolean; data: BldgUnitCostSetRecord }> => {
  const response = await api.get(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(id)}`, { params });
  return response.data;
};

export const listBldgUnitCostSetItems = async (
  id: string,
  params: { page?: number; limit?: number; includeDeleted?: boolean; search?: string } = {}
): Promise<{
  success: boolean;
  data: BldgUnitCostSetItemRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const response = await api.get(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(id)}/items`, { params });
  return response.data;
};

export const createBldgUnitCostSetItem = async (
  setId: string,
  payload: { strucType: string; bldgCode: string; bldgCodeDesc?: string | null; unitValue: number; effDate: string }
): Promise<{ success: boolean; data: BldgUnitCostSetItemRecord }> => {
  const response = await api.post(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(setId)}/items`, payload);
  return response.data;
};

export const updateBldgUnitCostSetItem = async (
  setId: string,
  itemId: string,
  payload: { strucType: string; bldgCode: string; bldgCodeDesc?: string | null; unitValue: number; effDate: string }
): Promise<{ success: boolean; data: BldgUnitCostSetItemRecord }> => {
  const response = await api.put(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(setId)}/items/${encodeURIComponent(itemId)}`, payload);
  return response.data;
};

export const deleteBldgUnitCostSetItem = async (setId: string, itemId: string, mode: 'soft' | 'hard' = 'soft') => {
  const response = await api.delete(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(setId)}/items/${encodeURIComponent(itemId)}`, {
    params: { mode },
  });
  return response.data as { success: boolean; data: { id: string; mode: 'soft' | 'hard' } };
};

export const updateBldgUnitCostSet = async (
  setId: string,
  payload: { ordinanceNo?: string; ordinanceDate?: string; ordinanceText?: string }
): Promise<{ success: boolean; data: BldgUnitCostSetRecord }> => {
  const response = await api.patch(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(setId)}`, payload);
  return response.data;
};

export const deleteBldgUnitCostSet = async (id: string, mode: 'soft' | 'hard' = 'soft'): Promise<{ success: boolean; data: { id: string; mode: 'soft' | 'hard' } }> => {
  const response = await api.delete(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(id)}`, { params: { mode } });
  return response.data;
};

export const restoreBldgUnitCostSet = async (id: string): Promise<{ success: boolean; data: { id: string } }> => {
  const response = await api.post(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(id)}/restore`);
  return response.data;
};

export const restoreBldgUnitCostSetItem = async (setId: string, itemId: string): Promise<{ success: boolean; data: { id: string } }> => {
  const response = await api.post(`${API_BASE}/bldg-unit-cost/sets/${encodeURIComponent(setId)}/items/${encodeURIComponent(itemId)}/restore`);
  return response.data;
};
