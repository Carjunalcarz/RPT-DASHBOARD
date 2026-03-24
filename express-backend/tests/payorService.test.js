const mockSupabasePrisma = {
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../src/database/prisma', () => ({
  supabasePrisma: mockSupabasePrisma,
}));

jest.mock('../src/services/identityVerificationService', () => ({
  verifyPayorIdentity: jest.fn().mockResolvedValue({ verified: true, provider: 'none' }),
}));

const payorService = require('../src/services/payorService');

describe('payorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes("table_name = 'payors'")) {
        return [{ 1: 1 }];
      }
      return [];
    });
  });

  it('searchPayors returns empty for blank query', async () => {
    const res = await payorService.searchPayors({ q: '   ' });
    expect(res).toEqual([]);
    expect(mockSupabasePrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('searchPayors queries database with fuzzy match', async () => {
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes("table_name = 'payors'")) {
        return [{ 1: 1 }];
      }
      return [{ id: '1', firstName: 'A' }];
    });
    const res = await payorService.searchPayors({ q: 'juan', limit: 5 });
    expect(mockSupabasePrisma.$queryRawUnsafe).toHaveBeenCalled();
    expect(res).toHaveLength(1);
  });

  it('createPayor creates and normalizes fields', async () => {
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql, ...params) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes("table_name = 'payors'")) {
        return [{ 1: 1 }];
      }
      if (s.includes('INSERT INTO public.payors')) {
        expect(params[0]).toBe('Juan');
        expect(params[1]).toBe('Dela Cruz');
        expect(params[2]).toBe('Somewhere');
        expect(params[3]).toBe('passport');
        expect(params[4]).toBe('AB123456');
        expect(params[6]).toBe('u1');
        return [{ id: 'p1' }];
      }
      return [];
    });
    const created = await payorService.createPayor({
      user: { id: 'u1' },
      payload: {
        firstName: ' Juan ',
        lastName: ' Dela Cruz ',
        address: ' Somewhere ',
        idType: 'Passport',
        idNumber: 'ab123456',
        contact: { phone: '+639171234567' },
      },
    });
    expect(created.id).toBe('p1');
  });

  it('createPayor throws 409 on unique conflict', async () => {
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes("table_name = 'payors'")) {
        return [{ 1: 1 }];
      }
      if (s.includes('INSERT INTO public.payors')) {
        const err = new Error('duplicate key value violates unique constraint "payors_id_type_id_number_key"');
        err.code = '23505';
        throw err;
      }
      return [];
    });
    await expect(
      payorService.createPayor({
        user: { id: 'u1' },
        payload: {
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          address: 'Somewhere',
          idType: 'passport',
          idNumber: 'AB123456',
          contact: { phone: '+639171234567' },
        },
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('bulkCreatePayors rejects invalid rows', async () => {
    await expect(payorService.bulkCreatePayors({ user: { id: 'u1' }, rows: [{}] })).rejects.toMatchObject({ statusCode: 400 });
  });
});
