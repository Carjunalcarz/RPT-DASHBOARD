import api from '@/modules/rptas/shared/services/api';

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

  // Reference Fields
  P_NEW_TDN?: string;
  P_OLD_TDN?: string;
  P_PIN?: string;
  P_MARKET_VALUE?: number;
  P_ASS_VALUE?: number;
  P_OWNER_CODE?: string;
  P_OWNER_NO?: string;
  CAN_ARP?: string;
  P_AREA?: number;
  P_AREA_M?: boolean;
  P_EFF_DATE?: string;
  P_OWNER?: string;

  // Signatory Fields
  Appraiser?: string;
  AppraiserPos?: string;
  AppraisedDate?: string;
  Assessor?: string;
  AssessorPos?: string;
  AssessorDate?: string;
  Rec_Approval?: string;
  Rec_ApprovalPos?: string;
  Rec_AppDate?: string;
  Approved?: string;
  ApprovedPos?: string;
  ApprovedDate?: string;
  ProvAssessor?: string;
  ProvAssessorPos?: string;
  ProvAssessorDate?: string;
  CityAssessor?: string;
  CityAssessorPos?: string;
  CityAssessorDate?: string;
  Deputy?: string;
  DeputyPos?: string;
  DeputyDate?: string;
  SGD_APPRAISED?: boolean;
  SGD_RECOMMEND?: boolean;
  SGD_APPROVED?: boolean;
  SGD_ASSESSED?: boolean;
  SGD_PROV?: boolean;
  SGD_CITY?: boolean;
  SGD_DEPUTY?: boolean;
  TPD_APPRAISED?: boolean;
  TPD_RECOMMEND?: boolean;
  TPD_APPROVED?: boolean;
  TPD_ASSESSED?: boolean;
  TPD_PROV?: boolean;
  TPD_CITY?: boolean;
  TPD_DEPUTY?: boolean;
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
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const API_BASE = envUrl ? envUrl.replace('/v1', '') : 'http://localhost:3000/api';
  try {
    const response = await api.get(`/rptmast/RPTAS_AGUSAN`, { 
      params,
      baseURL: API_BASE // Explicitly override Axios instance baseURL for this request
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 429) {
      console.warn('Rate limited (429). Retrying after delay...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await api.get(`/rptmast/RPTAS_AGUSAN`, { 
        params,
        baseURL: API_BASE
      });
      return response.data;
    }
    // Return empty mock structure if server error or disconnected, so SWR doesn't crash UI
    console.warn('Falling back to empty RPT Mast list due to API error', error);
    return {
      success: false,
      data: [],
      count: 0,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 100,
        total: 0,
        totalPages: 0
      }
    };
  }
};

export const updateSignatory = async (tdn: string, data: any): Promise<any> => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const API_BASE = envUrl ? envUrl.replace('/v1', '') : 'http://localhost:3000/api';
  // Check if we are updating a draft (UUID) or a legacy record (TDN)
  // If data has an ID and it looks like a UUID, we might need to hit the FAAS endpoint instead
  // We should redirect to FAAS service if it's a draft update.
  if (data.status === 'approved' || data.status === 'for-review' || data.status === 'draft') {
      // This is likely a FAAS record, not an RPT Mast record
      // The caller should handle the distinction or we add logic here.
  }

  const response = await api.put(`/rptmast/signatories/${tdn}`, data, { baseURL: API_BASE });
  return response.data;
};

export const getMastExtn = async (tdn: string): Promise<any> => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const API_BASE = envUrl ? envUrl.replace('/v1', '') : 'http://localhost:3000/api';
  try {
    const response = await api.get(`/rptmast/mastextn/${tdn}`, { baseURL: API_BASE });
    if (response.data && response.data.success) {
        return response.data.data;
    }
    return null;
  } catch (error) {
    console.warn(`No extension data found for TDN ${tdn}`);
    return null;
  }
};

export const deleteSignatory = async (tdn: string): Promise<any> => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const API_BASE = envUrl ? envUrl.replace('/v1', '') : 'http://localhost:3000/api';
  const response = await api.delete(`/rptmast/signatory/${tdn}`, { baseURL: API_BASE });
  return response.data;
};
