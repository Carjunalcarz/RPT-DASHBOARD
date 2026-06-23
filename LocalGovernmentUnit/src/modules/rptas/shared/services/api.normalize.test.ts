import { describe, it, expect } from 'vitest';
import { normalizeApiV1Base } from './api';

describe('normalizeApiV1Base', () => {
  it('keeps /api/v1 as-is', () => {
    expect(normalizeApiV1Base('http://localhost:3000/api/v1')).toBe('http://localhost:3000/api/v1');
    expect(normalizeApiV1Base('http://localhost:3000/api/v1/')).toBe('http://localhost:3000/api/v1');
  });

  it('appends /v1 when base ends with /api', () => {
    expect(normalizeApiV1Base('http://localhost:3000/api')).toBe('http://localhost:3000/api/v1');
    expect(normalizeApiV1Base('http://localhost:3000/api/')).toBe('http://localhost:3000/api/v1');
  });

  it('appends /api/v1 when base is host', () => {
    expect(normalizeApiV1Base('http://localhost:3000')).toBe('http://localhost:3000/api/v1');
    expect(normalizeApiV1Base('http://localhost:3000/')).toBe('http://localhost:3000/api/v1');
  });
});

