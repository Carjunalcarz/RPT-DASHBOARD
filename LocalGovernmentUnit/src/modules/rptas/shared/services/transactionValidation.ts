export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates if a record is eligible to start a new transaction.
 * @param record The source record
 * @param transactionType The requested transaction type
 * @returns ValidationResult
 */
export const validateTransactionStart = (
  record: any,
  transactionType: string
): ValidationResult => {
  const errors: string[] = [];

  if (!record) {
    return { isValid: false, errors: ['No record selected.'] };
  }

  // 1. Status Check: Only approved records can undergo transactions (except MIGRATE)
  if (record.status !== 'approved' && transactionType !== 'MIGRATE') {
    errors.push(`Cannot initiate ${transactionType} on a record with status '${record.status}'. Record must be 'approved'.`);
  }

  // 2. Data Integrity Checks on Source
  if (!record.TDN && !record.tdn) {
    errors.push('Source record is missing a Tax Declaration Number (TDN).');
  }

  if (!record.PIN && !record.pin) {
    errors.push('Source record is missing a Property Identification Number (PIN).');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Comprehensive input data validation before saving/submitting.
 * @param currentRecord The record being edited/saved
 * @returns ValidationResult
 */
export const validateTransactionSave = (currentRecord: any): ValidationResult => {
  const errors: string[] = [];

  if (!currentRecord) {
    return { isValid: false, errors: ['Record data is empty.'] };
  }

  const tdn = (currentRecord.TDN || currentRecord.tdn || '').trim();
  const pin = (currentRecord.PIN || currentRecord.pin || '').trim();
  const owner = (currentRecord.owner || currentRecord.OWNER_NAME || '').trim();
  const transCode = currentRecord.TRANS_CD;
  const pOldTdn = (currentRecord.pOldTdn || '').trim();

  // 1. Required Fields
  if (!tdn) errors.push('Tax Declaration Number (TDN) is required.');
  if (!pin) errors.push('Property Identification Number (PIN) is required.');
  if (!owner || owner.length < 2) errors.push('Owner name must be at least 2 characters.');

  // 2. Format Validation
  const tdnRegex = /^[0-9-%A-Za-z]+$/;
  if (tdn && !tdnRegex.test(tdn)) {
    errors.push('TDN must contain only letters, numbers, and hyphens.');
  }

  const pinRegex = /^[a-zA-Z0-9-%]+$/;
  if (pin && !pinRegex.test(pin)) {
    errors.push('PIN must contain only letters, numbers, and hyphens.');
  }

  // 3. Business Rules for Transactions
  if (transCode && pOldTdn) {
    // If this is a transaction (has TRANS_CD) and has a parent TDN
    // Usually, transactions like General Revision, Transfer, etc. result in a NEW TDN.
    // If the TDN hasn't been changed from the parent, it's a constraint violation.
    if (tdn === pOldTdn && transCode !== 'MIGRATE' && transCode !== 'REV') {
      errors.push(`TDN must be updated for transaction type '${transCode}'. It cannot remain identical to the previous TDN (${pOldTdn}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
