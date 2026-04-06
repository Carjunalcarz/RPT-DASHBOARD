import { describe, it, expect } from 'vitest';
import { validateTransactionStart, validateTransactionSave } from './transactionValidation';

describe('Transaction Validation Module', () => {
  
  describe('validateTransactionStart', () => {
    it('should reject if record is null', () => {
      const result = validateTransactionStart(null as any, 'GR');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No record selected.');
    });

    it('should reject starting a transaction on a non-approved record (except MIGRATE)', () => {
      const record: any = { status: 'draft', TDN: '123', PIN: '456' };
      const result = validateTransactionStart(record, 'GR');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/Cannot initiate GR on a record with status 'draft'/);
    });

    it('should allow MIGRATE on a non-approved record', () => {
      const record: any = { status: 'draft', TDN: '123', PIN: '456' };
      const result = validateTransactionStart(record, 'MIGRATE');
      expect(result.isValid).toBe(true);
    });

    it('should reject if source record is missing TDN or PIN', () => {
      const record: any = { status: 'approved', owner: 'Test Owner' };
      const result = validateTransactionStart(record, 'GR');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source record is missing a Tax Declaration Number (TDN).');
      expect(result.errors).toContain('Source record is missing a Property Identification Number (PIN).');
    });

    it('should pass for a valid approved record', () => {
      const record: any = { status: 'approved', TDN: '123-A', PIN: '456-B' };
      const result = validateTransactionStart(record, 'GR');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('validateTransactionSave', () => {
    it('should reject empty records', () => {
      const result = validateTransactionSave(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Record data is empty.');
    });

    it('should validate required fields', () => {
      const record = { owner: 'A', TDN: '', PIN: '' };
      const result = validateTransactionSave(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tax Declaration Number (TDN) is required.');
      expect(result.errors).toContain('Property Identification Number (PIN) is required.');
      expect(result.errors).toContain('Owner name must be at least 2 characters.');
    });

    it('should validate format of TDN and PIN', () => {
      const record = { owner: 'Test Owner', TDN: 'INVALID TDN!', PIN: 'INV@LID PIN' };
      const result = validateTransactionSave(record);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('TDN must contain only letters, numbers, and hyphens.');
      expect(result.errors).toContain('PIN must contain only letters, numbers, and hyphens.');
    });

    it('should enforce business rule: new TDN must differ from old TDN for certain transactions', () => {
      const record = { 
        owner: 'Test Owner', 
        TDN: '00-03-001', 
        PIN: '00-03-001-A', 
        pOldTdn: '00-03-001', 
        TRANS_CD: 'GR' 
      };
      const result = validateTransactionSave(record);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/TDN must be updated for transaction type 'GR'/);
    });

    it('should allow identical TDN if transaction is REV or MIGRATE', () => {
      const record = { 
        owner: 'Test Owner', 
        TDN: '00-03-001', 
        PIN: '00-03-001-A', 
        pOldTdn: '00-03-001', 
        TRANS_CD: 'REV' 
      };
      const result = validateTransactionSave(record);
      expect(result.isValid).toBe(true);
    });
  });
});
