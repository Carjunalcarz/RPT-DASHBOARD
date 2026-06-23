export type AccountType = 'Budgetary Accounts' | 'Financial Transactions';

export interface GeneralAccountingPlan {
  id: string;
  created_at: string;
  description: string;
  accounty_type: AccountType;
  status: boolean;
  editable: boolean;
  has_sub: boolean;
}

export interface GeneralAccountingPlanSub {
  id: string;
  created_at: string;
  description: string;
  general_accounting_plan_id: string;
  status: boolean;
  editable: boolean;
  plan?: Pick<GeneralAccountingPlan, 'id' | 'description' | 'accounty_type'>;
}

export type GeneralAccountingPlanFormData = Omit<GeneralAccountingPlan, 'id' | 'created_at'>;
export type GeneralAccountingPlanSubFormData = Omit<GeneralAccountingPlanSub, 'id' | 'created_at' | 'plan'>;

export interface GeneralAccountingPlanRequest {
  id: string;
  created_at: string;
  accounty_type: AccountType;
  general_accounting_plan_id: string;
  has_sub: boolean;
  general_accounting_plan_sub_id: string | null;
  request: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type GeneralAccountingPlanRequestFormData = Omit<GeneralAccountingPlanRequest, 'id' | 'created_at'>;

// ============================================================================
// ACCOUNT HIERARCHY TYPES
// ============================================================================

export interface AccountGroupHierarchy {
  id: string;
  code: string;
  description: string;
  status: boolean;
  created_at: string;
  editable: boolean;
}

export interface MajorAccountGroupHierarchy {
  id: string;
  code: string;
  description: string;
  account_group: string;
  status: boolean;
  created_at: string;
  editable: boolean;
}

export interface SubMajorAccountGroupHierarchy {
  id: string;
  code: string;
  description: string;
  major_account_group: string;
  status: boolean;
  created_at: string;
  editable: boolean;
}

export interface GeneralLedgerAccountHierarchy {
  id: string;
  code: string;
  description: string;
  sub_major_account_group: string;
  account_type: AccountType | null;
  status: boolean;
  created_at: string;
  editable: boolean;
}

export type CreateAccountGroupFormData = Omit<AccountGroupHierarchy, 'id' | 'created_at'>;
export type UpdateAccountGroupFormData = Partial<Omit<AccountGroupHierarchy, 'id' | 'created_at'>>;

export type CreateMajorAccountGroupFormData = Omit<MajorAccountGroupHierarchy, 'id' | 'created_at'>;
export type UpdateMajorAccountGroupFormData = Partial<Omit<MajorAccountGroupHierarchy, 'id' | 'created_at'>>;

export type CreateSubMajorAccountGroupFormData = Omit<SubMajorAccountGroupHierarchy, 'id' | 'created_at'>;
export type UpdateSubMajorAccountGroupFormData = Partial<Omit<SubMajorAccountGroupHierarchy, 'id' | 'created_at'>>;

export type CreateGeneralLedgerAccountFormData = Omit<GeneralLedgerAccountHierarchy, 'id' | 'created_at'>;
export type UpdateGeneralLedgerAccountFormData = Partial<Omit<GeneralLedgerAccountHierarchy, 'id' | 'created_at'>>;
