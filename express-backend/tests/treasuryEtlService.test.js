const treasuryEtlService = require('../src/services/treasuryEtlService');

describe('treasuryEtlService.exportPaidOrder', () => {
  it('rejects invalid order/property IDs', async () => {
    const tx = { $queryRawUnsafe: jest.fn(), $executeRawUnsafe: jest.fn() };
    await expect(
      treasuryEtlService.exportPaidOrder({
        tx,
        order: { id: 'not-a-uuid', orderNumber: 'OOP-1', amount: 1 },
        propertyIds: ['also-bad'],
        paidAt: new Date(),
        performedBy: { id: 'user-1' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('exports one row per property', async () => {
    const tx = { $queryRawUnsafe: jest.fn(), $executeRawUnsafe: jest.fn() };
    const orderId = '11111111-1111-4111-8111-111111111111';
    const p1 = '22222222-2222-4222-8222-222222222222';
    const p2 = '33333333-3333-4333-8333-333333333333';
    const paidAt = new Date('2026-03-24T00:00:00.000Z');

    tx.$queryRawUnsafe.mockImplementation(async (sql) => {
      const s = String(sql);
      if (s.includes('FROM public.rpt_property')) {
        return [
          {
            propertyId: p1,
            pin: 'PIN-1',
            tdn: 'TDN-1',
            taxBegYr: '2026',
            municipalityCode: 'M1',
            municipalityName: 'Municipality 1',
            barangayCode: 'B1',
            barangayName: 'Barangay 1',
            ownerName: 'Owner 1',
            ownerAddress: 'Address 1',
          },
          {
            propertyId: p2,
            pin: 'PIN-2',
            tdn: 'TDN-2',
            taxBegYr: '2026',
            municipalityCode: 'M1',
            municipalityName: 'Municipality 1',
            barangayCode: 'B2',
            barangayName: 'Barangay 2',
            ownerName: 'Owner 2',
            ownerAddress: 'Address 2',
          },
        ];
      }
      if (s.includes('FROM public.rpt_assessment')) {
        return [
          { propertyId: p1, marketValue: 1000, assessedValue: 500 },
          { propertyId: p2, marketValue: 2000, assessedValue: 1000 },
        ];
      }
      return [];
    });

    tx.$executeRawUnsafe.mockResolvedValue(1);

    const result = await treasuryEtlService.exportPaidOrder({
      tx,
      order: {
        id: orderId,
        orderNumber: 'OOP-20260324-TEST',
        description: 'desc',
        createdBy: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        dateCreated: new Date('2026-03-24T00:00:00.000Z'),
        amount: '100.00',
      },
      propertyIds: [p1, p2],
      paidAt,
      performedBy: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    });

    expect(result.exportedCount).toBe(2);
    expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(2);
  });
});

