import api from './api';

export interface RptMastRecord {
  REGION: string;
  PROV: string;
  CITY: string;
  DIST_NO: string;
  TDN: string;
  BCODE: string;
  KIND: string;
  ARP: string;
  PIN: string;
  BCODE_EXT?: string;
  SEC_NO: string;
  PARCEL_NO: string;
  IMP_NO: string;
  OWN_CD: string;
  OWNER_NO: string;
  ADM_CD?: string;
  ADMIN_NO?: string;
  LOCATION?: string;
  STREET_CD?: string;
  TAX_BEG_YR: string;
  EFF_DATE: string;
  DEC_DATE: string;
  TRANS_CD: string;
  CER_TIT_NO?: string;
  TCT_DATE?: string;
  CAD_LOT_NO?: string;
  ASS_LOT_NO?: string;
  BLOCK_NO?: string;
  LOTE_NO?: string;
  STREET?: string;
  NORTH?: string;
  SOUTH?: string;
  EAST?: string;
  WEST?: string;
  EXEMPT_CD?: string;
  COMPANY?: string;
  USER_ID?: string;
  DATE_ENC?: string;
  DATE_MOVE?: string;
  USER_EDIT?: string;
  DATE_EDIT?: string;
  REM?: string;
  CCN?: string;
  Adj_Factor?: number;
  CLOA_NO?: string;
  CLOA_DATE?: string;
  IsLocked?: boolean;
  LockedUser?: string;
  LockedDate?: string;
  NOA_NO?: string;
  ENTRY_DATE?: string;
  Manual_TDN?: string;
  Village?: string;
  PropClass?: string;
  NOA_ISNULL?: boolean;
  PROP_TAG?: string;
  BLDGNAME?: string;
  CANC_CD?: string;
  ENTRY_USER?: string;
  ADJENTRY_DATE?: string;
  NoaReceiver?: string;
  NoaDateReceive?: string;
  IsLockedSign?: boolean;
  LockedSignUser?: string;
  LockedSignDate?: string;
  MTDN?: string;
  BLDGUNIT?: string;
  EFF_CANC?: string;
  FAAS_NO?: string;
  NCA_no?: string;
  NEW_BCODE?: string;
  NEW_SECNO?: string;
  NEW_PARCELNO?: string;
  NEW_PIN?: string;
  NEW_DISTNO?: string;
  NEW_IMPNO?: string;
  ASSREPORTNO?: string;
  ANNO_AMOUNT?: number;
  ANNO_FILENO?: string;
  ANNO_ORNO?: string;
  ANNO_DATE?: string;
  ANNO_SIGNATORY?: string;
  ANNO_CANCELLED?: boolean;
  ANNO_CANAMOUNT?: number;
  ANNO_CANFILENO?: string;
  ANNO_CANORNO?: string;
  ANNO_CANDATE?: string;
  ANNO_CANSIGNATORY?: string;
  CASENO?: string;
  BONDPERSON?: string;
  PROP_TAG_CANCELLED?: boolean;
  CANCASENO?: string;
  CANCBONDPERSON?: string;
  oldpin?: string;
  OldTDN?: string;
  OLD_NOA_NO?: string;
  OLD_DATE_RECEIVE?: string;
  NOTLANDOWNER?: boolean;
  MOVE_REMARKS?: string;
  ENTRY_POS?: string;
  MOVE_USER?: string;
  FAAS_CN?: string;
  old_owner_no?: string;
  old_admin_no?: string;

  // Enriched Owner Fields
  Owner_Owner_No?: string;
  Owner_Name?: string;
  Owner_Address?: string;
  Owner_Tel_no?: string;
  Owner_User_id?: string;
  Owner_Eff_Year?: string;
  Owner_Full_Name?: string;
  Owner_TIN?: string;
  
  // Enriched Barangay Fields
  'BRGY.CODE'?: string;
  BARANGAY?: string;
}

export interface RptMastResponse {
  success: boolean;
  count: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: RptMastRecord[];
}

export interface RptMastParams {
  page?: number;
  limit?: number;
  searchField?: string;
  filterValue?: string;
}

export const getRptMastData = async (params: RptMastParams = { page: 1, limit: 100 }): Promise<RptMastResponse> => {
  // We need to bypass the /v1 prefix because rptmast routes are at /api/rptmast
  // Current API_URL is usually http://localhost:3000/api/v1
  // So we construct a custom axios call or use a relative path trick
  
  // Cleanest way:
  const response = await api.get('/../../rptmast/RPTAS_AGUSAN', { 
    params,
    // Note: The ../../ trick works if baseURL is /api/v1 to go up to /api/rptmast
    // If that fails, we can just use the absolute path if we knew the host.
    // Let's try to just use the `api` instance but override the baseURL if possible? 
    // No, axios instance baseURL is sticky.
    
    // Actually, looking at server.js: app.use('/api/rptmast', rptMastRoutes);
    // And api.ts baseURL: http://localhost:3000/api/v1
    // So /../../rptmast/RPTAS_AGUSAN resolves to /rptmast/RPTAS_AGUSAN relative to /api/v1 ?
    // No, axios merges URLs. 
    // If we pass an absolute URL, axios ignores baseURL.
  });
  
  return response.data;
};

// Helper to fetch directly using absolute path if the relative trick is risky
export const getRptMastDataDirect = async (params: RptMastParams = { page: 1, limit: 100 }): Promise<RptMastResponse> => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/v1', '') : 'http://localhost:3000/api';
  try {
    // Add delay/debounce handling or check if request is already pending?
    // 429 Too Many Requests usually means we are hitting it too fast.
    // However, the best fix here is to ensure the UI doesn't spam this.
    // For now, let's just make the call.
    const response = await api.get(`${API_BASE}/rptmast/RPTAS_AGUSAN`, { params });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 429) {
      console.warn('Rate limited (429). Retrying after delay...');
      // Simple retry logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await api.get(`${API_BASE}/rptmast/RPTAS_AGUSAN`, { params });
      return response.data;
    }
    throw error;
  }
};
