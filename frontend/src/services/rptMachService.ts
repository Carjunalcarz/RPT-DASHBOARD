import api from './api';

export interface RptMachRecord {
  REGION?: string;
  PROV?: string;
  CITY?: string;
  DISTRICT?: string;
  Tdn: string;
  KIND?: string;
  Classification?: string;
  Actual_use?: string;
  SubClass?: string;
  Code?: string;
  Brand_Model?: string;
  Capacity?: string;
  D_acquired?: string;
  D_installed?: string;
  D_operated?: string;
  Condition?: string;
  Est_life?: number;
  Rem_life?: number;
  No_units?: number;
  Acq_cost?: number;
  Rep_cost?: number;
  Freight?: number;
  Insurance?: number;
  Installation?: number;
  Others?: number;
  Market_val?: number;
  Depreciation?: number;
  Dep_market?: number;
  StraightDep?: number;
  Salvage?: number;
  Acquisition_DPVal?: number;
  Appraisal_DPVal?: number;
  SERIALNO?: string;
  PurchaseType?: string;
  Conv_Factor?: number;
  Adj_Mvalue?: number;
  IncludeUnitCnt?: string;
  Orig_Cost?: number;
  MachineDesc?: string;
  Sub_Tdn?: string;
  UM?: string;
  Disposal_Mvalue?: number;
  NoYrs?: number;
}

export interface RptMachResponse {
  status: string;
  data: RptMachRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getMachineryByTdn = async (tdn: string): Promise<RptMachRecord[]> => {
  try {
    const response = await api.get(`/rpt-mach/${tdn}`);
    if (response.data && response.data.data) {
        return response.data.data;
    }
    // Fallback if structure is different
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching machinery records:', error);
    return [];
  }
};

export const createMachinery = async (data: Partial<RptMachRecord>): Promise<RptMachRecord | null> => {
  // TODO: Implement create API
  console.warn('Create machinery API not implemented yet');
  return null;
};

export const updateMachinery = async (tdn: string, data: Partial<RptMachRecord>): Promise<RptMachRecord | null> => {
  // TODO: Implement update API
  console.warn('Update machinery API not implemented yet');
  return null;
};

export const deleteMachinery = async (tdn: string): Promise<boolean> => {
  // TODO: Implement delete API
  console.warn('Delete machinery API not implemented yet');
  return false;
};
