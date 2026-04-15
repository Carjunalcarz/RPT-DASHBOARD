const { AppError } = require('../../../middleware/errorHandler');

const normalize = (v) => String(v ?? '').trim();

const normalizeNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const normalizeBool = (v) => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return null;
};

const toAssessmentCore = (r) => ({
  TDN: normalize(r?.TDN ?? r?.tdn),
  KIND: normalize(r?.KIND ?? r?.kind).toUpperCase(),
  CLASSIFICATION: normalize(r?.CLASSIFICATION ?? r?.classification).toUpperCase(),
  ACTUAL_USE: normalize(r?.ACTUAL_USE ?? r?.actualUse).toUpperCase(),
  SUB_CLASS: normalize(r?.SUB_CLASS ?? r?.subClass),
  AREA: normalizeNumber(r?.AREA ?? r?.area),
  IF_DEFAULT: normalizeBool(r?.IF_DEFAULT ?? r?.ifDefault),
  UNIT_VALUE: normalizeNumber(r?.UNIT_VALUE ?? r?.unitValue),
  ASS_LEVEL: normalizeNumber(r?.ASS_LEVEL ?? r?.assessmentLevel),
  TAXABLE_RATE: normalizeNumber(r?.TAXABLE_RATE ?? r?.taxableRate),
  TAXABILITY: normalize(r?.TAXABILITY ?? r?.taxability).toUpperCase(),
});

const stableKey = (r) =>
  [
    normalize(r?.KIND ?? '').toUpperCase(),
    normalize(r?.CLASSIFICATION ?? '').toUpperCase(),
    normalize(r?.ACTUAL_USE ?? '').toUpperCase(),
    normalize(r?.SUB_CLASS ?? ''),
    String(normalizeNumber(r?.AREA) ?? ''),
    String(normalizeBool(r?.IF_DEFAULT) ?? ''),
  ].join('|');

const diffObject = (before, after, allowedKeys) => {
  const changes = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    const a = before?.[k];
    const b = after?.[k];
    const eq = a === b || (Number.isNaN(a) && Number.isNaN(b));
    if (!eq) {
      changes.push({ key: k, from: a, to: b, allowed: allowedKeys.includes(k) });
    }
  }
  return changes;
};

const validateStandardRevisionAssessments = (baseline, next) => {
  const allowed = ['UNIT_VALUE', 'ASS_LEVEL', 'TAXABLE_RATE'];
  const baselineList = (baseline || []).map(toAssessmentCore);
  const nextList = (next || []).map(toAssessmentCore);

  const baselineByKey = new Map();
  baselineList.forEach((r) => baselineByKey.set(stableKey(r), r));

  const errors = [];
  const audit = [];

  nextList.forEach((r) => {
    const key = stableKey(r);
    const prior = baselineByKey.get(key);
    if (!prior) {
      errors.push(`Assessment row does not match MSSQL baseline: ${key}`);
      return;
    }

    const changes = diffObject(prior, r, allowed);
    const lockedChanges = changes.filter((c) => !c.allowed);
    if (lockedChanges.length > 0) {
      const fields = lockedChanges.map((c) => c.key).join(', ');
      errors.push(`Locked fields changed in assessment row ${key}: ${fields}`);
    }

    const allowedChanges = changes.filter((c) => c.allowed);
    if (allowedChanges.length > 0) {
      audit.push({
        key,
        changes: allowedChanges.map((c) => ({ field: c.key, from: c.from, to: c.to })),
      });
    }
  });

  return { isValid: errors.length === 0, errors, audit };
};

const assertStandardRevisionAllowed = (baseline, next) => {
  const result = validateStandardRevisionAssessments(baseline, next);
  if (!result.isValid) {
    throw new AppError(result.errors[0], 400);
  }
  return result;
};

module.exports = {
  validateStandardRevisionAssessments,
  assertStandardRevisionAllowed,
};

