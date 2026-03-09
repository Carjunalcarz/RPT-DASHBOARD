const faasService = require('../src/services/faasService');
const rptMastService = require('../src/services/rptMastService');
const { supabasePrisma } = require('../src/database/prisma');
const { AppError } = require('../src/middleware/errorHandler');

// Mock dependencies
jest.mock('../src/services/rptMastService');
jest.mock('../src/database/prisma', () => ({
  supabasePrisma: {
    faasRecord: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn()
    },
    migrationLog: {
        create: jest.fn()
    }
  }
}));

describe('FAAS Transaction Validation', () => {
  const mockUser = 'test@example.com';
  const mockData = {
    tdn: '2024-01-001',
    pin: '053-01-001-001-001',
    TRANS_CD: 'TR',
    pOldTdn: '2023-01-001' // Parent TDN
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks for success path
    supabasePrisma.faasRecord.findFirst.mockResolvedValue(null); // No drafts
    rptMastService.checkDuplicate.mockResolvedValue({
        tdnExists: false,
        pinExists: false
    });
    supabasePrisma.faasRecord.create.mockResolvedValue({ id: 'new-id', ...mockData });
  });

  test('should allow valid transaction with unique identifiers', async () => {
    await expect(faasService.saveDraft(mockData, mockUser)).resolves.not.toThrow();
    
    expect(rptMastService.checkDuplicate).toHaveBeenCalledWith(mockData.tdn, mockData.pin);
  });

  test('should prevent submission if TDN exists in pending drafts', async () => {
    // Mock existing draft
    supabasePrisma.faasRecord.findFirst.mockResolvedValue({ id: 'existing-draft-id', tdn: mockData.tdn });

    await expect(faasService.saveDraft(mockData, mockUser))
      .rejects
      .toThrow(/TDN .* is already pending/);
  });

  test('should prevent submission if TDN exists in active records (MSSQL)', async () => {
    // Mock MSSQL conflict
    rptMastService.checkDuplicate.mockResolvedValue({
        tdnExists: true,
        tdnRecord: { TDN: mockData.tdn },
        pinExists: false
    });

    await expect(faasService.saveDraft(mockData, mockUser))
      .rejects
      .toThrow(/TDN .* is currently active/);
  });

  test('should prevent submission if PIN exists in active records (unrelated record)', async () => {
    // Mock MSSQL PIN conflict with UNRELATED record
    rptMastService.checkDuplicate.mockResolvedValue({
        tdnExists: false,
        pinExists: true,
        pinRecord: { TDN: 'UNRELATED-TDN', PIN: mockData.pin }
    });

    await expect(faasService.saveDraft(mockData, mockUser))
      .rejects
      .toThrow(/PIN .* already exists/);
  });

  test('should allow duplicate PIN if inherited from parent (pOldTdn matches)', async () => {
    // Mock MSSQL PIN conflict with PARENT record
    rptMastService.checkDuplicate.mockResolvedValue({
        tdnExists: false,
        pinExists: true,
        pinRecord: { TDN: mockData.pOldTdn, PIN: mockData.pin } // Found record IS the parent
    });

    await expect(faasService.saveDraft(mockData, mockUser)).resolves.not.toThrow();
  });

  test('should allow update of existing draft (self-update)', async () => {
    const updateData = { ...mockData, id: 'existing-uuid-123' };
    
    // Mock findFirst to ignore self
    supabasePrisma.faasRecord.findFirst.mockResolvedValue(null);
    supabasePrisma.faasRecord.update.mockResolvedValue(updateData);

    await expect(faasService.saveDraft(updateData, mockUser)).resolves.not.toThrow();
  });
});