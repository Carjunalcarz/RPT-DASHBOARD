import api from './api';

export interface RptTreeRecord {
  REGION: string;
  PROV: string;
  CITY: string;
  DISTRICT: string;
  TDN: string;
  Prod_Code: string;
  Area: number;
  Tot_FB: number;
  Non_FB: number;
  FB: number;
  Age: number;
  Unit_Price: number;
  Market_Value: number;
  NFB_UnitPrice: number;
}

export interface RptTreeResponse {
  status: string;
  data: RptTreeRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TreeLibraryRecord {
  Region: string;
  Prov: string;
  City: string;
  Code: string;
  Description: string;
  Eff_Date: string;
  Rate: number;
  NFB_Rate: number;
}

export const getTreeLibrary = async (): Promise<TreeLibraryRecord[]> => {
  try {
    const response = await api.get<{ status: string; data: TreeLibraryRecord[] }>('/rpt-tree/library');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching tree library:', error);
    return [];
  }
};

export const getTreesByTdn = async (tdn: string): Promise<RptTreeRecord[]> => {
  try {
    const response = await api.get<RptTreeResponse>(`/rpt-tree/${tdn}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching tree records:', error);
    return [];
  }
};

export const getAllTrees = async (params = {}) => {
  try {
    const response = await api.get<RptTreeResponse>('/rpt-tree', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching all tree records:', error);
    throw error;
  }
};
