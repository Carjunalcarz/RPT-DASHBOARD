export interface PropertyRecord {
  id: string;
  TDN: string;
  ARP: string;
  PIN: string;
  OWNER_NO: string;
  owner: string;
  barangay: string;
  barangayCode: string;
  cityCode: string;
  // Reference Fields
  pNewTdn?: string;
  pOldTdn?: string;
  pPin?: string;
  pMarketValue?: number;
  pAssessedValue?: number;
  pOwnerCode?: string;
  pOwnerNo?: string;
  canArp?: string;
  pArea?: number;
  pAreaM?: boolean;
  pEffDate?: string;
  pOwner?: string;

  // Signatory Fields
  appraisedBy?: string;
  appraisedPos?: string;
  appraisedDate?: string;
  assessor?: string;
  assessorPos?: string;
  assessorDate?: string;
  recApproval?: string;
  recApprovalPos?: string;
  recAppDate?: string;
  approved?: string;
  approvedPos?: string;
  approvedDate?: string;
  provAssessor?: string;
  provAssessorPos?: string;
  provAssessorDate?: string;
  cityAssessor?: string;
  cityAssessorPos?: string;
  cityAssessorDate?: string;
  deputy?: string;
  deputyPos?: string;
  deputyDate?: string;
  sgdAppraised?: boolean;
  sgdRecommend?: boolean;
  sgdApproved?: boolean;
  sgdAssessed?: boolean;
  sgdProv?: boolean;
  sgdCity?: boolean;
  sgdDeputy?: boolean;
  tpdAppraised?: boolean;
  tpdRecommend?: boolean;
  tpdApproved?: boolean;
  tpdAssessed?: boolean;
  tpdProv?: boolean;
  tpdCity?: boolean;
  tpdDeputy?: boolean;
  status?: string;
  assessments?: any[];
  trees?: any[]; // Tree/Plant Assessments
  TRANS_CD?: string; // Transaction Code
  REM?: string; // Remarks

  // Official Form Fields
  CER_TIT_NO?: string;
  TCT_DATE?: string;
  CAD_LOT_NO?: string;
  LOTE_NO?: string;
  CLOA_NO?: string;
  CLOA_DATE?: string;
  ASS_LOT_NO?: string;
  BLOCK_NO?: string;
  STREET?: string;
  NORTH?: string;
  EAST?: string;
  SOUTH?: string;
  WEST?: string;

  // Enriched Fields (mapped in print document)
  Owner_Address?: string;
  Owner_TIN?: string;
  Owner_Tel_no?: string;
  ADMIN_NO?: string;
  ADMIN_ADDRESS?: string;
  ADMIN_TIN?: string;
  ADMIN_TEL?: string;

  // Back Part Fields
  taxable?: boolean;
  exempt?: boolean;
  effQtr?: string;
  effYear?: string;
  memoranda?: string;
  
  // Superseded Assessment
  pAssValueLand?: number;
  pAssValueImpvt?: number;
  TAX_BEG_YR?: string;
  pAssValueTotal?: number;
  pArPageNo?: string;
  pRecordingPersonnel?: string;
}
