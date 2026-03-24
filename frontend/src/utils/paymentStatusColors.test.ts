import { describe, expect, it } from 'vitest';
import { getPaymentBadgeClassName, getPaymentRowClassName, normalizePaymentStatus, isPaymentSelectionDisabled } from './paymentStatusColors';

describe('paymentStatusColors', () => {
  it('normalizes payment statuses to stable keys', () => {
    expect(normalizePaymentStatus('Paid')).toBe('completed');
    expect(normalizePaymentStatus('Completed')).toBe('completed');
    expect(normalizePaymentStatus('pending')).toBe('pending');
    expect(normalizePaymentStatus('Failed')).toBe('failed');
    expect(normalizePaymentStatus('Cancelled')).toBe('cancelled');
    expect(normalizePaymentStatus('Unpaid')).toBe('unpaid');
    expect(normalizePaymentStatus('')).toBe('unknown');
    expect(normalizePaymentStatus(null)).toBe('unknown');
  });

  it('returns expected row color classes per status', () => {
    expect(getPaymentRowClassName('Paid')).toContain('emerald');
    expect(getPaymentRowClassName('Pending')).toContain('amber');
    expect(getPaymentRowClassName('Failed')).toContain('red');
    expect(getPaymentRowClassName('Cancelled')).toContain('slate');
    expect(getPaymentRowClassName('Unpaid')).toContain('slate');
  });

  it('returns expected badge color classes per status', () => {
    expect(getPaymentBadgeClassName('Paid')).toContain('emerald');
    expect(getPaymentBadgeClassName('Pending')).toContain('amber');
    expect(getPaymentBadgeClassName('Failed')).toContain('red');
    expect(getPaymentBadgeClassName('Cancelled')).toContain('slate');
    expect(getPaymentBadgeClassName('Unpaid')).toContain('slate');
  });

  it('correctly identifies statuses that should disable row selection', () => {
    // Disabled statuses
    expect(isPaymentSelectionDisabled('Paid')).toBe(true);
    expect(isPaymentSelectionDisabled('Completed')).toBe(true);
    expect(isPaymentSelectionDisabled('Pending')).toBe(true);
    
    // Enabled statuses
    expect(isPaymentSelectionDisabled('Unpaid')).toBe(false);
    expect(isPaymentSelectionDisabled('Failed')).toBe(false);
    expect(isPaymentSelectionDisabled('Cancelled')).toBe(false);
    expect(isPaymentSelectionDisabled('')).toBe(false);
    expect(isPaymentSelectionDisabled(null)).toBe(false);
  });
});

