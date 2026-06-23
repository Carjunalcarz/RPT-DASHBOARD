import api from '@/modules/rptas/shared/services/api';

export interface OrdinanceValueRecord {
  id: string;
  ordinanceNo: string;
  effectivityDate: string;
  structureClass: string;
  subClass: string;
  unitValue: number;
  buildingType: {
    code: string;
    name: string;
  };
}

export interface OrdinanceResponse {
  success: boolean;
  data: OrdinanceValueRecord[];
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

const ORDINANCE_VALUES_TTL_MS = 5 * 60 * 1000;
const ordinanceValuesCache = new Map<string, { value: OrdinanceResponse; expiresAt: number }>();
const ordinanceValuesInFlight = new Map<string, Promise<OrdinanceResponse>>();

/**
 * Get all ordinance values with optional filtering
 */
export const getOrdinanceValues = async (params: { 
  page?: number; 
  limit?: number; 
  type?: string; 
  class?: string; 
  subClass?: string 
} = {}): Promise<OrdinanceResponse> => {
  const key = JSON.stringify(params ?? {});
  const now = Date.now();
  const cached = ordinanceValuesCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = ordinanceValuesInFlight.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const response = await api.get(`${API_BASE}/ordinance/2024`, { params });
    const value = response.data as OrdinanceResponse;
    if (value?.success) {
      ordinanceValuesCache.set(key, { value, expiresAt: Date.now() + ORDINANCE_VALUES_TTL_MS });
    }
    return value;
  })().finally(() => {
    ordinanceValuesInFlight.delete(key);
  });

  ordinanceValuesInFlight.set(key, promise);
  return promise;
};

/**
 * Lookup specific unit value
 */
export const getOrdinanceValueLookup = async (
  type: string, 
  structureClass: string, 
  subClass: string
): Promise<OrdinanceValueRecord | null> => {
  try {
    const response = await api.get(`${API_BASE}/ordinance/2024/lookup`, { 
      params: { type, class: structureClass, subClass } 
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    return null;
  }
};
