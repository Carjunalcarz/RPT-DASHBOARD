import api from './api';

export interface BldgStrucRecord {
  Region: string;
  Prov: string;
  City: string;
  DISTRICT: string;
  TDN: string;
  KIND: string;
  Classification: string;
  Actual_use: string;
  SubClass: string;
  Struc_type: string;
  BldgCode: string;
  Storey: string;
  TAXABILITY: boolean;
  BU: boolean;
  D_construct: string;
  D_occupied: string;
  D_complete: string;
  Maintenance: string;
  Age: string;
  Dep_Code: string;
  Dep_Rate: number;
  Floor_area: number;
  UNIT_VALUE: number;
  OLD_MVAL: number;
  Market_Val: number;
  ASS_LEVEL: number;
  ASS_VALUE: number;
  Foundation: string;
  Posts: string;
  Beams: string;
  Truss_Framing: string;
  Roof: string;
  Ext_Walls: string;
  Flooring: string;
  Doors: string;
  Ceiling: string;
  Windows: string;
  Stairs: string;
  Partition: string;
  Wall_Finish: string;
  Electrical: string;
  Toilet_Bath: string;
  Plumbing: string;
  Fixtures: string;
  StoreyDesc: string;
  Bldg_Permit: string;
  Total_Area: number;
  FloorOrd: number;
  Others: string;
  P_CONSTRUCT: string;
  FloorJoists: string;
  FloorDesc: string;
  FrameFlooring: string;
  FinFlooring: string;
  FrameExt_Walls: string;
  FinExt_Walls: string;
  FrameRoof: string;
  FinRoof: string;
  FramePartition: string;
  FinPartition: string;
  FrameCeiling: string;
  FinCeiling: string;
  Sub_Tdn: string;
  C_occupied: string;
  C_complete: string;
  IsImprovement: boolean;
  Struc_Desc: string;
  Struc_Part: string;
  BUCC_CODE: string;
  BUCC_Rate: number;
  AdjustedUnitValue: number;
  FirstFloor: string;
  SecondFloor: string;
  ThirdFloor: string;
}

export interface BldgStrucResponse {
  success: boolean;
  count: number;
  data: BldgStrucRecord[];
}

export const getBldgStrucByTdn = async (tdn: string): Promise<BldgStrucRecord[]> => {
  if (!tdn) return [];
  
  // Fix: Don't remove /v1 from the URL if it's already part of the base API structure
  // The backend routes are mounted at /api/bldg-struc, but axios base might be /api/v1
  // If the backend doesn't use v1 prefix for these routes, we need to adjust.
  // The server.js shows: app.use('/api/bldg-struc', bldgStrucRoutes);
  // So the URL should be /api/bldg-struc/:tdn
  
  // If VITE_API_URL is http://localhost:3000/api/v1
  // We need to replace /v1 with nothing to get /api
  // OR just construct the full URL carefully.
  
  // Assuming VITE_API_URL is http://localhost:3000/api/v1
  const API_BASE = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/v1\/?$/, '') 
    : 'http://localhost:3000/api';
  
  try {
    console.log(`Fetching structure for TDN: ${tdn} from ${API_BASE}/bldg-struc/${tdn}`);
    const response = await api.get(`${API_BASE}/bldg-struc/${tdn}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch building structure records', error);
    return [];
  }
};

export const createBldgStruc = async (data: Partial<BldgStrucRecord>): Promise<BldgStrucRecord | null> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  try {
    const response = await api.post(`${API_BASE}/bldg-struc`, data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to create building structure record', error);
    throw error;
  }
};

export const updateBldgStruc = async (tdn: string, floorOrd: number, data: Partial<BldgStrucRecord>): Promise<BldgStrucRecord | null> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  try {
    const response = await api.put(`${API_BASE}/bldg-struc/${tdn}/${floorOrd}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to update building structure record', error);
    throw error;
  }
};

export const deleteBldgStruc = async (tdn: string, floorOrd: number): Promise<boolean> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/v1\/?$/, '') : 'http://localhost:3000/api';
  try {
    await api.delete(`${API_BASE}/bldg-struc/${tdn}/${floorOrd}`);
    return true;
  } catch (error) {
    console.error('Failed to delete building structure record', error);
    throw error;
  }
};
