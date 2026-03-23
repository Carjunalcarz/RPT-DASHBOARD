const express = require('express');
const request = require('supertest');

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
};

jest.mock('../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', role: 'admin' };
  next();
});

jest.mock('../src/generated/supabase-client-v6', () => ({
  PrismaClient: function PrismaClient() {
    return mockPrisma;
  },
}));

describe('reports/properties payment_status compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back when rpt_property.payment_status does not exist', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([])
      .mockImplementationOnce(async (sql) => {
        expect(String(sql)).toContain(`'unpaid' as "paymentStatus"`);
        expect(String(sql)).not.toContain('rp.payment_status as "paymentStatus"');
        return [
          {
            assessmentId: 'A-1',
            kind: 'Building',
            assLevel: 0,
            taxability: 'N/A',
            classification: 'N/A',
            subclass: 'N/A',
            area: 0,
            measurement: '',
            marketValue: 0,
            assValue: 0,
            propertyId: 'P-1',
            pin: 'PIN',
            tdn: 'TDN',
            ownerName: 'Owner',
            municipality: 'Municipality',
            barangay: 'Barangay',
            muncode: '01',
            bcode: '01',
            taxBegYr: '2026',
            transCode: 'T',
            taxYear: '2026',
            paymentStatus: 'unpaid',
          },
        ];
      });

    const router = require('../src/routes/reportsRoutes');
    const app = express();
    app.use('/api/v1/reports', router);

    const res = await request(app).get('/api/v1/reports/properties?page=1&limit=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].paymentStatus).toBe('unpaid');
  });

  it('uses rp.payment_status when the column exists', async () => {
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockImplementationOnce(async (sql) => {
        expect(String(sql)).toContain('rp.payment_status as "paymentStatus"');
        return [
          {
            assessmentId: 'A-1',
            kind: 'Building',
            assLevel: 0,
            taxability: 'N/A',
            classification: 'N/A',
            subclass: 'N/A',
            area: 0,
            measurement: '',
            marketValue: 0,
            assValue: 0,
            propertyId: 'P-1',
            pin: 'PIN',
            tdn: 'TDN',
            ownerName: 'Owner',
            municipality: 'Municipality',
            barangay: 'Barangay',
            muncode: '01',
            bcode: '01',
            taxBegYr: '2026',
            transCode: 'T',
            taxYear: '2026',
            paymentStatus: 'pending',
          },
        ];
      });

    jest.resetModules();
    const router = require('../src/routes/reportsRoutes');
    const app = express();
    app.use('/api/v1/reports', router);

    const res = await request(app).get('/api/v1/reports/properties?page=1&limit=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].paymentStatus).toBe('pending');
  });

  it('retries without payment_status if column check is wrong', async () => {
    const missing = new Error('column rp.payment_status does not exist');
    missing.code = '42703';

    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([{ 1: 1 }])
      .mockImplementationOnce(async (sql) => {
        expect(String(sql)).toContain('rp.payment_status as "paymentStatus"');
        throw missing;
      })
      .mockImplementationOnce(async (sql) => {
        expect(String(sql)).toContain(`'unpaid' as "paymentStatus"`);
        return [
          {
            assessmentId: 'A-1',
            kind: 'Building',
            assLevel: 0,
            taxability: 'N/A',
            classification: 'N/A',
            subclass: 'N/A',
            area: 0,
            measurement: '',
            marketValue: 0,
            assValue: 0,
            propertyId: 'P-1',
            pin: 'PIN',
            tdn: 'TDN',
            ownerName: 'Owner',
            municipality: 'Municipality',
            barangay: 'Barangay',
            muncode: '01',
            bcode: '01',
            taxBegYr: '2026',
            transCode: 'T',
            taxYear: '2026',
            paymentStatus: 'unpaid',
          },
        ];
      });

    jest.resetModules();
    const router = require('../src/routes/reportsRoutes');
    const app = express();
    app.use('/api/v1/reports', router);

    const res = await request(app).get('/api/v1/reports/properties?page=1&limit=10');
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].paymentStatus).toBe('unpaid');
  });
});
