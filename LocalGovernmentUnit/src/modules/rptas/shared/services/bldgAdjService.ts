import api from '@/modules/rptas/shared/services/api';

export interface BldgAdjRecord {
  Region: string;
  Prov: string;
  City: string;
  DISTRICT: string;
  TDN: string;
  KIND: string;
  Classification: string;
  Actual_use: string;
  SubClass: string;
  Struc_Type: string;
  BldgCode: string;
  Storey: string;
  MainComp: string;
  CompExtn: string;
  DescNote: string;
  Area: number;
  AdditionalArea: boolean;
  UnitCost: number;
  BaseVal: number;
  PercentCost: number;
  Market_Val: number;
  Dep_Rate: number;
  Acc_Dep: number;
  Sub_total: number;
  Additional: number;
  SeqNo: string;
  ISADDITIONAL: boolean;
  FloorOrd: number;
  Sub_Tdn: string;
  PercentComp: number;
}

export interface BldgAdjResponse {
  success: boolean;
  count: number;
  data: BldgAdjRecord[];
}

export const getBldgAdjByTdn = async (tdn: string): Promise<BldgAdjRecord[]> => {
  if (!tdn) return [];
  
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL).replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  
  try {
    const response = await api.get(`${API_BASE}/bldg-adj/${tdn}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch building adjustment records', error);
    // Return empty array instead of throwing to prevent breaking UI
    return [];
  }
};

export const createBldgAdj = async (data: Partial<BldgAdjRecord>): Promise<BldgAdjRecord | null> => {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL).replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  try {
    const response = await api.post(`${API_BASE}/bldg-adj`, data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to create building adjustment record', error);
    throw error;
  }
};

export const updateBldgAdj = async (tdn: string, seqNo: string, data: Partial<BldgAdjRecord>): Promise<BldgAdjRecord | null> => {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL).replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  try {
    const response = await api.put(`${API_BASE}/bldg-adj/${tdn}/${seqNo}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to update building adjustment record', error);
    throw error;
  }
};

export const deleteBldgAdj = async (tdn: string, seqNo: string): Promise<boolean> => {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) ? (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL).replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  try {
    await api.delete(`${API_BASE}/bldg-adj/${tdn}/${seqNo}`);
    return true;
  } catch (error) {
    console.error('Failed to delete building adjustment record', error);
    throw error;
  }
};
