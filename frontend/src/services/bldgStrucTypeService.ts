import api from './api';

export interface BldgStrucTypeRecord {
  Code: string;
  Description: string;
  EFF_DATE: string;
  REGION: string;
  PROV: string;
  CITY: string;
  Struc_Desc?: string;
  Struc_Part?: string;
  DEC_DATE?: string;
}

export interface BldgStrucTypeResponse {
  success: boolean;
  data: BldgStrucTypeRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getBldgStrucTypes = async (params: { page?: number; limit?: number; code?: string; city?: string } = {}): Promise<BldgStrucTypeResponse> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
  const response = await api.get(`${API_BASE}/bldg-struc-type`, { params });
  return response.data;
};