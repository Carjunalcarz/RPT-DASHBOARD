const request = require('supertest');

// Mock Auth Middleware
jest.mock('../src/middleware/auth', () => (req, res, next) => {
  req.user = { id: 'test-user', role: 'admin' };
  next();
});

const app = require('../src/server');
const { poolPromise } = require('../src/database/mssql');

// Mock MSSQL
jest.mock('../src/database/mssql', () => {
  const mRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn()
  };
  const mPool = {
    request: jest.fn().mockReturnValue(mRequest)
  };
  return {
    poolPromise: Promise.resolve(mPool)
  };
});

describe('RPT_ASS API Endpoints', () => {
  let pool;
  let mockRequest;

  beforeAll(async () => {
    pool = await poolPromise;
    mockRequest = pool.request();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/rpt-ass', () => {
    it('should retrieve all records', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ total: 1 }] // Count query
      }).mockResolvedValueOnce({
        recordset: [{ TDN: '123', REGION: '13' }] // Data query
      });

      const res = await request(app)
        .get('/api/rpt-ass')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].TDN).toBe('123');
    });
  });

  describe('GET /api/rpt-ass/:id', () => {
    it('should retrieve a single record by ID', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ TDN: '123', REGION: '13' }]
      });

      const res = await request(app)
        .get('/api/rpt-ass/123')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.TDN).toBe('123');
    });

    it('should return 404 if record not found', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: []
      });

      await request(app)
        .get('/api/rpt-ass/999')
        .expect(404);
    });
  });

  describe('POST /api/rpt-ass', () => {
    it('should create a new record', async () => {
      const newRecord = {
        TDN: 'NEW-123',
        REGION: '13',
        PROV: 'ADN',
        CITY: 'BUTUAN',
        KIND: 'L',
        CLASSIFICATION: 'RES',
        FOR_YEAR: 2024,
        MARKET_VAL: 10000,
        ASS_VALUE: 2000
      };

      mockRequest.query.mockResolvedValueOnce({
        recordset: [newRecord]
      });

      const res = await request(app)
        .post('/api/rpt-ass')
        .send(newRecord)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.TDN).toBe('NEW-123');
    });

    it('should fail validation if required fields are missing', async () => {
      const invalidRecord = {
        TDN: 'NEW-123'
        // Missing other required fields
      };

      await request(app)
        .post('/api/rpt-ass')
        .send(invalidRecord)
        .expect(400);
    });
  });

  describe('PUT /api/rpt-ass/:id', () => {
    it('should update an existing record', async () => {
      const updateData = {
        MARKET_VAL: 15000
      };

      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ TDN: '123', MARKET_VAL: 15000 }]
      });

      const res = await request(app)
        .put('/api/rpt-ass/123')
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.MARKET_VAL).toBe(15000);
    });
  });

  describe('DELETE /api/rpt-ass/:id', () => {
    it('should soft delete a record', async () => {
      // Mock check exists
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ TDN: '123' }]
      });
      // Mock update
      mockRequest.query.mockResolvedValueOnce({
        recordset: [] // Update query usually returns affected rows or we select back. Service selects back check.recordset[0]
      });
      
      // Wait, my service implementation for delete returns check.recordset[0] (the original record)
      // and doesn't explicitly return the updated one unless I change it.
      // But `await request.query(query)` for update returns result.
      // The service code: `return check.recordset[0];`
      
      const res = await request(app)
        .delete('/api/rpt-ass/123')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('soft delete');
    });
  });
});
