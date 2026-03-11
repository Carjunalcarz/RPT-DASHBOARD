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
}
