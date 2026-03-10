const { transformTdn, transformPin } = require('../src/utils/dataTransformation');

describe('Data Transformation Utilities', () => {
    describe('transformTdn', () => {
        test('should transform valid TDN with 4-digit suffix', () => {
            const input = '25-01-0001-0010';
            const expected = '25-01-0001-00010';
            expect(transformTdn(input)).toBe(expected);
        });

        test('should not transform TDN with 5-digit suffix', () => {
            const input = '25-01-0001-00010';
            expect(transformTdn(input)).toBe(input);
        });

        test('should not transform TDN with non-numeric suffix', () => {
            const input = '25-01-0001-ABCD';
            expect(transformTdn(input)).toBe(input);
        });

        test('should handle empty or invalid input', () => {
            expect(transformTdn('')).toBe('');
            expect(transformTdn(null)).toBe(null);
            expect(transformTdn('invalid')).toBe('invalid');
        });
    });

    describe('transformPin', () => {
        test('should transform valid PIN with 4-digit suffix', () => {
            const input = '053-01-0001-002-14-1008';
            const expected = '053-01-0001-002-14-01008';
            expect(transformPin(input)).toBe(expected);
        });

        test('should not transform PIN with 5-digit suffix', () => {
            const input = '053-01-0001-002-14-01008';
            expect(transformPin(input)).toBe(input);
        });

        test('should handle empty or invalid input', () => {
            expect(transformPin('')).toBe('');
            expect(transformPin(null)).toBe(null);
        });
    });
});
