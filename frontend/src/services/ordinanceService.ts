import api from './api';

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
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
  const response = await api.get(`${API_BASE}/ordinance/2024`, { params });
  return response.data;
};

/**
 * Lookup specific unit value
 */
export const getOrdinanceValueLookup = async (
  type: string, 
  structureClass: string, 
  subClass: string
): Promise<OrdinanceValueRecord | null> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
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