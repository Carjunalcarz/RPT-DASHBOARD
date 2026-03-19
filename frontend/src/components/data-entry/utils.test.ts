import { cleanPin, validatePin } from './utils';

describe('cleanPin Utility', () => {
  it('should remove leading and trailing whitespace', () => {
    expect(cleanPin('  053-01-0009-002-2-1001  ')).toBe('053-01-0009-002-2-1001');
  });

  it('should remove internal whitespace', () => {
    expect(cleanPin('053-01-0009-002-2   -1001')).toBe('053-01-0009-002-2-1001');
    expect(cleanPin('053 - 01 - 0009 - 002 - 2 - 1001')).toBe('053-01-0009-002-2-1001');
  });

  it('should handle tabs and other whitespace characters', () => {
    expect(cleanPin('053\t-01\n-0009\r-002-2-1001')).toBe('053-01-0009-002-2-1001');
  });

  it('should return empty string for null or undefined', () => {
    expect(cleanPin(null)).toBe('');
    expect(cleanPin(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(cleanPin('')).toBe('');
    expect(cleanPin('   ')).toBe('');
  });

  it('should handle already clean PINs', () => {
    const clean = '053-01-0009-002-2-1001';
    expect(cleanPin(clean)).toBe(clean);
  });
});

describe('validatePin Utility', () => {
  it('should validate correct PIN formats', () => {
    expect(validatePin('053-01-0009-002-2-1001')).toBe(true);
    expect(validatePin('123-45-678')).toBe(true);
    expect(validatePin('123')).toBe(true);
  });

  it('should reject PINs with non-numeric/non-hyphen characters', () => {
    expect(validatePin('053-01-0009-002-2A-1001')).toBe(false);
    expect(validatePin('053 01 0009')).toBe(false);
    expect(validatePin('053.01.0009')).toBe(false);
  });

  it('should reject malformed hyphenation', () => {
    expect(validatePin('-053-01')).toBe(false);
    expect(validatePin('053-01-')).toBe(false);
    expect(validatePin('053--01')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(validatePin('')).toBe(false);
  });
});
