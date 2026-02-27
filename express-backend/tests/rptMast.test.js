const request = require('supertest');
const { AppError } = require('../src/middleware/errorHandler');

// We need to mock auth middleware dynamically
const mockAuth = jest.fn((req, res, next) => {
  req.user = { id: 'admin-user', role: 'admin' };
  next();
});

jest.mock('../src/middleware/auth', () => (req, res, next) => mockAuth(req, res, next));

const app = require('../src/server');
const { poolPromise } = require('../src/database/mssql');

// Mock MSSQL
const mockQuery = jest.fn();
jest.mock('../src/database/mssql', () => {
  const mRequest = {
    input: jest.fn().mockReturnThis(),
    query: mockQuery
  };
  const mPool = {
    request: jest.fn().mockReturnValue(mRequest)
  };
  return {
    poolPromise: Promise.resolve(mPool)
  };
});

describe('RPT_MAST Municipality Access Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow admin to view all data (no city filter)', async () => {
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { id: 'admin', role: 'admin' };
      next();
    });
    
    // Count query? No, just one query in service
    mockQuery.mockResolvedValueOnce({ recordset: [] }); 

    await request(app).get('/api/rptmast/RPTAS_AGUSAN');
    
    // Verify query does NOT contain AND m.CITY = ...
    // The query is the first argument to the first call
    const queryCall = mockQuery.mock.calls[0][0];
    
    expect(queryCall).not.toContain("AND m.CITY = '");
  });

  it('should allow admin to filter by specific municipality', async () => {
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { id: 'admin', role: 'admin' };
      next();
    });
    
    mockQuery.mockResolvedValue({ recordset: [] });

    await request(app).get('/api/rptmast/RPTAS_AGUSAN?municipalityCode=02');
    
    const queryCall = mockQuery.mock.calls[0][0];
    expect(queryCall).toContain("AND m.CITY = '02'");
  });

  it('should restrict regular user to assigned municipality', async () => {
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { id: 'user', role: 'user', municipalityCode: '03' };
      next();
    });
    
    mockQuery.mockResolvedValue({ recordset: [] });

    await request(app).get('/api/rptmast/RPTAS_AGUSAN');
    
    const queryCall = mockQuery.mock.calls[0][0];
    expect(queryCall).toContain("AND m.CITY = '03'");
  });

  it('should block regular user if trying to override municipality', async () => {
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { id: 'user', role: 'user', municipalityCode: '03' };
      next();
    });
    
    mockQuery.mockResolvedValue({ recordset: [] });

    // User tries to request 02
    await request(app).get('/api/rptmast/RPTAS_AGUSAN?municipalityCode=02');
    
    const queryCall = mockQuery.mock.calls[0][0];
    // Should still use 03
    expect(queryCall).toContain("AND m.CITY = '03'");
    expect(queryCall).not.toContain("AND m.CITY = '02'");
  });

  it('should return empty/error if user has no municipality code', async () => {
    mockAuth.mockImplementation((req, res, next) => {
      req.user = { id: 'user', role: 'user' }; // No code
      next();
    });
    
    const res = await request(app).get('/api/rptmast/RPTAS_AGUSAN');
    
    expect(res.body.data).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
