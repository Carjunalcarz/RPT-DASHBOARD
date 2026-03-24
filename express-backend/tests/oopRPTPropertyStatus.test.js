const mockSupabasePrisma = {
  oopHistory: { create: jest.fn() },
  $transaction: jest.fn(),
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../src/database/prisma', () => ({
  supabasePrisma: mockSupabasePrisma,
}));

jest.mock('crypto', () => ({
  randomBytes: () => Buffer.from('abcdef', 'hex'),
}));

jest.mock('../src/services/treasuryEtlService', () => ({
  exportPaidOrder: jest.fn().mockResolvedValue({
    etlRunId: 'run-1',
    etlVersion: 1,
    exportedCount: 2,
    warningsCount: 0,
  }),
}));

const oopService = require('../src/services/oopService');

describe('OOP updates rpt_property payment status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabasePrisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('information_schema.tables') && s.includes('sidebar_item_user_visibility')) {
        return [{ 1: 1 }];
      }
      if (s.includes('FROM public.sidebar_items') && s.includes('WHERE path = $1')) {
        return [{ id: 'sidebar-treasury' }];
      }
      if (s.includes('COUNT(*)') && s.includes('sidebar_item_user_visibility')) {
        return [{ count: 1 }];
      }
      if (s.includes('AND user_id') && s.includes('sidebar_item_user_visibility')) {
        return [{ 1: 1 }];
      }
      return [];
    });
  });

  it('sets rpt_property unpaid -> pending when order is created', async () => {
    const tx = {
      orderOfPayment: { create: jest.fn() },
      oopHistory: { create: jest.fn() },
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    };

    tx.orderOfPayment.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'OOP-20260323-ABCDEF',
      createdBy: 'user-1',
      amount: '100.00',
      description: 'desc',
      status: 'pending',
      dateCreated: new Date(),
      dateModified: new Date(),
    });

    tx.$queryRawUnsafe.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT id::text as id, payment_status')) {
        return [
          { id: 'p1', paymentStatus: 'unpaid' },
          { id: 'p2', paymentStatus: 'unpaid' },
        ];
      }
      if (String(sql).includes('UPDATE public.rpt_property')) {
        return [{ id: 'p1' }, { id: 'p2' }];
      }
      return [];
    });
    tx.oopHistory.create.mockResolvedValue({ id: 'h1' });

    mockSupabasePrisma.$transaction.mockImplementation(async (fn) => fn(tx));

    const res = await oopService.createOrder({
      user: { id: 'user-1', role: 'user' },
      amount: 100,
      description: 'desc',
      requestBody: { assessments: [{ propertyId: 'p1' }, { propertyId: 'p2' }] },
    });

    expect(res.id).toBe('order-1');
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.orders_of_payment'),
      expect.any(String),
      'order-1'
    );
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.rpt_property'),
      'pending',
      ['p1', 'p2'],
      'unpaid'
    );
  });

  it('rejects creating an order if any property is not unpaid', async () => {
    const tx = {
      orderOfPayment: { create: jest.fn() },
      oopHistory: { create: jest.fn() },
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    };

    tx.$queryRawUnsafe.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT id::text as id, payment_status')) {
        return [
          { id: 'p1', paymentStatus: 'unpaid' },
          { id: 'p2', paymentStatus: 'pending' },
        ];
      }
      return [];
    });

    mockSupabasePrisma.$transaction.mockImplementation(async (fn) => fn(tx));

    await expect(
      oopService.createOrder({
        user: { id: 'user-1', role: 'user' },
        amount: 100,
        description: 'desc',
        requestBody: { assessments: [{ propertyId: 'p1' }, { propertyId: 'p2' }] },
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(tx.orderOfPayment.create).not.toHaveBeenCalled();
  });

  it('sets rpt_property pending -> paid when assigned user confirms paid', async () => {
    const tx = {
      orderOfPayment: { findUnique: jest.fn(), update: jest.fn() },
      oopHistory: { create: jest.fn() },
      $queryRawUnsafe: jest.fn(),
    };

    tx.orderOfPayment.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'pending',
      createdBy: 'user-1',
    });

    tx.orderOfPayment.update.mockResolvedValue({
      id: 'order-1',
      status: 'paid',
    });
    tx.oopHistory.create.mockResolvedValue({ id: 'h2' });

    tx.$queryRawUnsafe.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT COALESCE(property_ids')) {
        return [{ propertyIds: ['p1', 'p2'] }];
      }
      if (String(sql).includes('UPDATE public.rpt_property')) {
        return [{ id: 'p1' }, { id: 'p2' }];
      }
      return [];
    });

    mockSupabasePrisma.$transaction.mockImplementation(async (fn) => fn(tx));

    const res = await oopService.markPaid({
      user: { id: 'u-assigned', role: 'user' },
      orderId: 'order-1',
      requestBody: {},
    });

    expect(res.order.status).toBe('paid');
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE public.rpt_property'),
      'paid',
      ['p1', 'p2'],
      'pending'
    );
  });
});
