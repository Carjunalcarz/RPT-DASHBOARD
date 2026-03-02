import api from './api';

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

export const getBldgUnitCosts = async (params: { page?: number; limit?: number; strucType?: string; bldgCode?: string; city?: string } = {}): Promise<BldgUnitCostResponse> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
  const response = await api.get(`${API_BASE}/bldg-unit-cost`, { params });
  return response.data;
};

export const getBldgUnitCostLookup = async (strucType: string, bldgCode: string, city?: string): Promise<BldgUnitCostRecord | null> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
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