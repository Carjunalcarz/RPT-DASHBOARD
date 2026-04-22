import api from "../../../../services/api";

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
  STRUCTURE_UNIT_VALUE?: number;
  STRUCTURE_MARKET_VAL?: number;
  STRUCTURE_ASS_VALUE?: number;
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
  trees?: any[];
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

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/v1', '')
  : 'http://localhost:3000/api';

const RPT_ASS_TTL_MS = 60 * 1000;
const rptAssByTdnCache = new Map<string, { value: RptAssRecord[]; expiresAt: number }>();
const rptAssByTdnInFlight = new Map<string, Promise<RptAssRecord[]>>();

export const getRptAssByTdn = async (tdn: string): Promise<RptAssRecord[]> => {
  if (!tdn) return [];

  const key = String(tdn).trim();
  const now = Date.now();
  const cached = rptAssByTdnCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight = rptAssByTdnInFlight.get(key);
  if (inFlight) return inFlight;

  try {
    const promise = api
      .get(`${API_BASE}/rpt-ass`, {
        params: {
          TDN: key,
          limit: 1000,
          _ts: Date.now(),
        },
      })
      .then((response) => {
        const rows = (response.data?.data || []) as RptAssRecord[];
        rptAssByTdnCache.set(key, { value: rows, expiresAt: Date.now() + RPT_ASS_TTL_MS });
        return rows;
      })
      .catch((error) => {
        const status = error?.response?.status;
        if (status === 304 && cached) return cached.value;
        console.error('Failed to fetch assessment records', error);
        throw error;
      })
      .finally(() => {
        rptAssByTdnInFlight.delete(key);
      });

    rptAssByTdnInFlight.set(key, promise);
    return promise;
  } catch (error) {
    console.error('Failed to fetch assessment records', error);
    throw error;
  }
};
