const { validateStandardRevisionAssessments, assertStandardRevisionAllowed } = require('../revisionPolicy');

describe('revisionPolicy', () => {
  test('allows changing unit value and assessment level only', () => {
    const baseline = [
      { KIND: 'Land', CLASSIFICATION: 'A', ACTUAL_USE: 'AA', SUB_CLASS: 'A-1', AREA: 1, IF_DEFAULT: true, UNIT_VALUE: 10, ASS_LEVEL: 20 },
    ];
    const next = [
      { KIND: 'Land', CLASSIFICATION: 'A', ACTUAL_USE: 'AA', SUB_CLASS: 'A-1', AREA: 1, IF_DEFAULT: true, UNIT_VALUE: 11, ASS_LEVEL: 25 },
    ];

    const res = validateStandardRevisionAssessments(baseline, next);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.audit).toHaveLength(1);
    expect(res.audit[0].changes.map((c) => c.field).sort()).toEqual(['ASS_LEVEL', 'UNIT_VALUE']);
  });

  test('rejects changing main class or actual use', () => {
    const baseline = [
      { KIND: 'Land', CLASSIFICATION: 'A', ACTUAL_USE: 'AA', SUB_CLASS: 'A-1', AREA: 1, IF_DEFAULT: true, UNIT_VALUE: 10, ASS_LEVEL: 20 },
    ];
    const next = [
      { KIND: 'Land', CLASSIFICATION: 'C', ACTUAL_USE: 'AA', SUB_CLASS: 'A-1', AREA: 1, IF_DEFAULT: true, UNIT_VALUE: 10, ASS_LEVEL: 20 },
    ];
    expect(() => assertStandardRevisionAllowed(baseline, next)).toThrow();
  });

  test('rejects assessment rows that do not match MSSQL baseline', () => {
    const baseline = [
      { KIND: 'Land', CLASSIFICATION: 'A', ACTUAL_USE: 'AA', SUB_CLASS: 'A-1', AREA: 1, IF_DEFAULT: true, UNIT_VALUE: 10, ASS_LEVEL: 20 },
    ];
    const next = [
      { KIND: 'Land', CLASSIFICATION: 'A', ACTUAL_USE: 'AA', SUB_CLASS: 'A-2', AREA: 1, IF_DEFAULT: true, UNIT_VALUE: 10, ASS_LEVEL: 20 },
    ];
    const res = validateStandardRevisionAssessments(baseline, next);
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

