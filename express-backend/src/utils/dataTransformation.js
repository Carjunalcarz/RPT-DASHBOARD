/**
 * Data Transformation Utilities for RPT Migration
 */

/**
 * Transforms TDN by adding a leading zero to the last segment if it has 4 digits.
 * Format: XX-XX-XXXX-XXXX -> XX-XX-XXXX-XXXXX
 * Example: 25-01-0001-0010 -> 25-01-0001-00010
 * @param {string} tdn 
 * @returns {string} Transformed TDN
 */
const transformTdn = (tdn) => {
    if (!tdn || typeof tdn !== 'string') return tdn;
    
    const parts = tdn.split('-');
    if (parts.length < 2) return tdn; // Not a valid format to transform

    const lastIndex = parts.length - 1;
    const lastPart = parts[lastIndex];

    // Check if last part is numeric and has length 4
    if (/^\d{4}$/.test(lastPart)) {
        parts[lastIndex] = '0' + lastPart;
        return parts.join('-');
    }

    return tdn;
};

/**
 * Transforms PIN by adding a leading zero to the last segment if it has 4 digits.
 * Format: XXX-XX-XXXX-XXX-XX-XXXX -> XXX-XX-XXXX-XXX-XX-XXXXX
 * Example: 053-01-0001-002-14-1008 -> 053-01-0001-002-14-01008
 * @param {string} pin 
 * @returns {string} Transformed PIN
 */
const transformPin = (pin) => {
    if (!pin || typeof pin !== 'string') return pin;

    const parts = pin.split('-');
    if (parts.length < 2) return pin;

    const lastIndex = parts.length - 1;
    const lastPart = parts[lastIndex];

    // Check if last part is numeric and has length 4
    if (/^\d{4}$/.test(lastPart)) {
        parts[lastIndex] = '0' + lastPart;
        return parts.join('-');
    }

    return pin;
};

module.exports = {
    transformTdn,
    transformPin
};
