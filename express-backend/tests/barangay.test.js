const request = require('supertest');

// Mock Auth Middleware
jest.mock('../src/middleware/auth', () => {
  const protect = (req, res, next) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  };
  protect.restrictTo = (...roles) => (req, res, next) => next();
  return protect;
});

// Mock @react-pdf/renderer and pdfRoutes to avoid ES module/JSX syntax errors in Jest
jest.mock('@react-pdf/renderer', () => ({
  renderToStream: jest.fn()
}));
jest.mock('../src/modules/rptas/routes/pdfRoutes', () => {
  const express = require('express');
  return express.Router();
});

const app = require('../src/server');
const { poolPromise } = require('../src/modules/rptas/database/mssql');

// Mock MSSQL
jest.mock('../src/modules/rptas/database/mssql', () => {
  const mRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn()
  };
  const mPool = {
    request: jest.fn().mockReturnValue(mRequest)
  };
  return {
    poolPromise: Promise.resolve(mPool),
    sql: { Int: jest.fn() }
  };
});

describe('Barangay API Endpoints', () => {
  let pool;
  let mockRequest;

  beforeAll(async () => {
    pool = await poolPromise;
    mockRequest = pool.request();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/barangays', () => {
    it('should retrieve paginated barangay records', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ total: 2 }] // Count query
      }).mockResolvedValueOnce({
        recordset: [
          { BGY_CODE: '001', BGY_NAME: 'Barangay 1' },
          { BGY_CODE: '002', BGY_NAME: 'Barangay 2' }
        ] // Data query
      });

      const res = await request(app)
        .get('/api/barangays?page=1&pageSize=10')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].BGY_CODE).toBe('001');
      expect(res.body.metadata.total).toBe(2);
      expect(res.body.metadata.page).toBe(1);
      expect(res.body.metadata.pageSize).toBe(10);
    });

    it('should return 404 if no records found', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{ total: 0 }] // Count query
      }).mockResolvedValueOnce({
        recordset: [] // Data query
      });

      const res = await request(app)
        .get('/api/barangays')
        .expect(404);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('No barangay records found');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/api/barangays?page=-1')
        .expect(400);

      expect(res.body.status).toBe('fail'); // AppError sets status to 'fail' for 4xx
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/barangays')
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });
});
