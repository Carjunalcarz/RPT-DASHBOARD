const rptAssService = require('../src/services/rptAssService');
const { AppError } = require('../src/middleware/errorHandler');

describe('RptAssService.getAreaWithUnit', () => {
  test('should return hectares when isDefault is true', () => {
    const area = 3.5037;
    const isDefault = true;
    const result = rptAssService.getAreaWithUnit(area, isDefault);
    expect(result).toBe('3.5037 ha');
  });

  test('should return square meters when isDefault is false', () => {
    const area = 3.5037;
    const isDefault = false;
    const result = rptAssService.getAreaWithUnit(area, isDefault);
    expect(result).toBe('3.5037 m²');
  });

  test('should handle string input for area', () => {
    const area = '123.45';
    const isDefault = false;
    const result = rptAssService.getAreaWithUnit(area, isDefault);
    expect(result).toBe('123.45 m²');
  });

  test('should return 0 m² for invalid area input', () => {
    const area = 'invalid';
    const isDefault = false;
    const result = rptAssService.getAreaWithUnit(area, isDefault);
    expect(result).toBe('0 m²');
  });

  test('should return 0 m² for zero area', () => {
    const area = 0;
    const isDefault = false;
    const result = rptAssService.getAreaWithUnit(area, isDefault);
    expect(result).toBe('0 m²');
  });
});
