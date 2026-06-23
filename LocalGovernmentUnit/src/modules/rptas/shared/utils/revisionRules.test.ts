import { describe, expect, test } from 'vitest';
import { getAssessmentRevisionPermissions } from './revisionRules';

describe('getAssessmentRevisionPermissions', () => {
  test('standard revision locks main class and actual use for MSSQL', () => {
    const p = getAssessmentRevisionPermissions({
      transactionCode: 'REV',
      dataSource: 'mssql',
      isContextComplete: true,
      isMainClassValidInContext: true,
      isActualUseValidInContext: true,
    });
    expect(p.isStandardRevision).toBe(true);
    expect(p.canEditMainClass).toBe(false);
    expect(p.canEditActualUse).toBe(false);
    expect(p.canEditUnitValue).toBe(true);
    expect(p.canEditAssessmentLevel).toBe(true);
    expect(p.hasErrorInput).toBe(false);
    expect(p.canEditContext).toBe(false);
  });

  test('missing context triggers error and unlocks context edits in revision', () => {
    const p = getAssessmentRevisionPermissions({
      transactionCode: 'REV',
      dataSource: 'mssql',
      isContextComplete: false,
      isMainClassValidInContext: true,
      isActualUseValidInContext: true,
    });
    expect(p.hasErrorInput).toBe(true);
    expect(p.canEditContext).toBe(true);
    expect(p.canEditMainClass).toBe(false);
  });

  test('non-revision allows edits', () => {
    const p = getAssessmentRevisionPermissions({
      transactionCode: 'NEW',
      dataSource: 'mssql',
      isContextComplete: false,
      isMainClassValidInContext: false,
      isActualUseValidInContext: false,
    });
    expect(p.isStandardRevision).toBe(false);
    expect(p.canEditContext).toBe(true);
    expect(p.canEditMainClass).toBe(true);
    expect(p.canEditActualUse).toBe(true);
  });
});

