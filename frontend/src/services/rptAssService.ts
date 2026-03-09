import api from './api';

export interface RptAssRecord {
  TDN: string;
  REGION: string;
  PROV: string;
  CITY: string;
  DISTRICT: string;
  KIND: string;
  CLASSIFICATION: string;
  ACTUAL_USE: string;
  SUB_CLASS: string;
  EFF_DATE: string;
  FOR_YEAR: number;
  AREA: number;
  IF_DEFAULT: boolean;
  UNIT_VALUE: number;
  MARKET_VAL: number;
  OLD_MVAL: number;
  ASS_LEVEL: number;
  TAXABLE_RATE: number;
  ASS_VALUE: number;
  TAXABILITY: string;
  BU: string;
  SQAREA: number;
  IdleLand: boolean;
  LinearUnit: string;
  LegalBasis: string;
  ISGREATERAREA: boolean;
  ISGREATERAREA_WAU: boolean;
  Length: number;
  sqDecimeter: number;
  Sub_Tdn: string;
  LAND_DESC: string;
  Disposal_Mvalue: number;
  WIDTH: number;
  TOTALDIRECTCOST: number;
  ACTUALCUT: string;
  MVALTIMBER: number;
  AREACOVERED: number;
  TOTALCONS: number;
  AREACOVEREDMUN: number;
  PERCENTAREA: number;
  MARKETVALMUN: number;
  IDLE_DECDATE: string;
  IDLE_DATEEFF: string;
  IDLE_UNLISTED: boolean;
  IDLE_USERNAME: string;
  DIRECTLOGCOST: number;
  DOMEPRICELOG: number;
  // UI-specific fields (optional)
  id?: string;
  uniqueId?: string;
}

export interface RptAssResponse {
  success: boolean;
  count: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: RptAssRecord[];
}

export const getRptAssByTdn = async (tdn: string): Promise<RptAssRecord[]> => {
  if (!tdn) return [];
  // Use the absolute path strategy similar to rptMastService if needed, 
  // but let's assume standard api usage first. 
  // If rptMastService uses a hack, we might need it here too.
  // rptMastService used: `${API_BASE}/rptmast/RPTAS_AGUSAN`
  // rptAssRoutes are mounted at /api/rpt-ass
  
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
  
  try {
    const response = await api.get(`${API_BASE}/rpt-ass`, { 
      params: { 
        TDN: tdn,
        limit: 1000 // Get all assessments for this TDN
      } 
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch assessment records', error);
    throw error;
  }
};
