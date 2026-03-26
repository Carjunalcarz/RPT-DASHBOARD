/**
 * Utility functions for data cleaning and formatting in the data-entry module.
 */

/**
 * Cleans a Property Index Number (PIN) by removing all extraneous whitespace.
 * This includes leading, trailing, and internal spaces.
 * 
 * @param pin The PIN string to clean. Can be null or undefined.
 * @returns The cleaned PIN string, or an empty string if input is null/undefined.
 */
export const cleanPin = (pin: string | null | undefined): string => {
  if (pin === null || pin === undefined) {
    return '';
  }
  
  // Remove all whitespace characters
  return pin.replace(/\s+/g, '');
};

/**
 * Validates a PIN format.
 * Expected format: series of numbers separated by hyphens.
 * Example: 053-01-0009-002-2-1001
 * 
 * @param pin The PIN string to validate.
 * @returns true if valid, false otherwise.
 */
export const validatePin = (pin: string): boolean => {
  if (!pin) return false;
  
  // Basic validation: only digits and hyphens, should not start/end with hyphen
  const pinRegex = /^\d+(-\d+)*$/;
  return pinRegex.test(pin);
};
