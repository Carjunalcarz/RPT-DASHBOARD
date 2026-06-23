export type RevisionDataSource = 'mssql' | 'supabase';

export type RevisionPermissions = {
  isStandardRevision: boolean;
  hasErrorInput: boolean;
  canEditContext: boolean;
  canEditMainClass: boolean;
  canEditActualUse: boolean;
  canEditUnitValue: boolean;
  canEditAssessmentLevel: boolean;
};

export const getAssessmentRevisionPermissions = (params: {
  transactionCode?: string;
  dataSource?: RevisionDataSource;
  isContextComplete: boolean;
  isMainClassValidInContext: boolean;
  isActualUseValidInContext: boolean;
}): RevisionPermissions => {
  const isStandardRevision = String(params.transactionCode || '').trim().toUpperCase() === 'REV';
  const isMssqlSourced = (params.dataSource || 'mssql') === 'mssql';
  const mainLocked = isStandardRevision && isMssqlSourced;
  const actualUseLocked = isStandardRevision && isMssqlSourced;

  const hasErrorInput =
    isStandardRevision &&
    (!params.isContextComplete || !params.isMainClassValidInContext || !params.isActualUseValidInContext);

  const canEditContext = !isStandardRevision || hasErrorInput;

  return {
    isStandardRevision,
    hasErrorInput,
    canEditContext,
    canEditMainClass: !mainLocked,
    canEditActualUse: !actualUseLocked,
    canEditUnitValue: true,
    canEditAssessmentLevel: true,
  };
};

