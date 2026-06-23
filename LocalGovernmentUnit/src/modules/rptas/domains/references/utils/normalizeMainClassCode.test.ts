import { describe, it, expect } from 'vitest';
import { normalizeMainClassCode } from './normalizeMainClassCode';

describe('normalizeMainClassCode', () => {
  it('normalizes empty and falsy values', () => {
    expect(normalizeMainClassCode('')).toBe('');
    expect(normalizeMainClassCode('   ')).toBe('');
    expect(normalizeMainClassCode(null)).toBe('');
    expect(normalizeMainClassCode(undefined)).toBe('');
  });

  it('extracts code from common label formats', () => {
    expect(normalizeMainClassCode('C')).toBe('C');
    expect(normalizeMainClassCode('c')).toBe('C');
    expect(normalizeMainClassCode('C - COMMERCIAL')).toBe('C');
    expect(normalizeMainClassCode('C–COMMERCIAL')).toBe('C');
    expect(normalizeMainClassCode('C (COMMERCIAL)')).toBe('C');
    expect(normalizeMainClassCode(' C  -  COMMERCIAL ')).toBe('C');
  });

  it('keeps multi-char codes when present', () => {
    expect(normalizeMainClassCode('IRR - SAMPLE')).toBe('IRR');
    expect(normalizeMainClassCode('IRR (SAMPLE)')).toBe('IRR');
  });
});

