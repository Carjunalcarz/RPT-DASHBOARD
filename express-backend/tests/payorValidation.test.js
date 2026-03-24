const { validatePayorPayload, normalizeIdKey } = require('../src/services/payorValidation');

describe('payorValidation', () => {
  it('validates required fields', () => {
    const res = validatePayorPayload({});
    expect(res.ok).toBe(false);
    expect(res.errors.firstName).toBeTruthy();
    expect(res.errors.lastName).toBeTruthy();
    expect(res.errors.address).toBeTruthy();
    expect(res.errors.idType).toBeTruthy();
    expect(res.errors.idNumber).toBeTruthy();
    expect(res.errors.contact).toBeTruthy();
  });

  it('validates passport format', () => {
    const bad = validatePayorPayload({
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      idType: 'passport',
      idNumber: '12',
      contact: { phone: '+639171234567' },
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.idNumber).toMatch(/Passport/);

    const good = validatePayorPayload({
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      idType: 'passport',
      idNumber: 'AB123456',
      contact: { phone: '+639171234567' },
    });
    expect(good.ok).toBe(true);
  });

  it('validates national id format', () => {
    const bad = validatePayorPayload({
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      idType: 'national_id',
      idNumber: 'ABC',
      contact: { phone: '+639171234567' },
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.idNumber).toMatch(/National ID/);

    const good = validatePayorPayload({
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      idType: 'national_id',
      idNumber: '12345678',
      contact: { phone: '+639171234567' },
    });
    expect(good.ok).toBe(true);
  });

  it('validates contact formats', () => {
    const badPhone = validatePayorPayload({
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      idType: 'passport',
      idNumber: 'AB123456',
      contact: { phone: 'x' },
    });
    expect(badPhone.ok).toBe(false);
    expect(badPhone.errors.contact).toMatch(/Phone/);

    const badEmail = validatePayorPayload({
      firstName: 'A',
      lastName: 'B',
      address: 'C',
      idType: 'passport',
      idNumber: 'AB123456',
      contact: { email: 'nope' },
    });
    expect(badEmail.ok).toBe(false);
    expect(badEmail.errors.contact).toMatch(/Email/);
  });

  it('normalizes id key', () => {
    expect(normalizeIdKey('Passport', 'ab123')).toBe('passport::AB123');
  });
});

