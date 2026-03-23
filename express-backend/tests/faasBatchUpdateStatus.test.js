jest.mock('../src/database/prisma', () => ({
  supabasePrisma: {},
}));

jest.mock('../src/services/rptMastService', () => ({}));
jest.mock('../src/services/rptAssService', () => ({}));

const faasService = require('../src/services/faasService');

describe('FaasService.batchUpdateStatus', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('deduplicates ids and runs sequentially', async () => {
    const calls = [];
    jest.spyOn(faasService, 'updateStatus').mockImplementation(async (id) => {
      calls.push(id);
      return { id };
    });

    const res = await faasService.batchUpdateStatus(
      ['a', 'a', 'b', 'b', 'c'],
      'pending-provincial',
      'ok',
      'user@example.com',
      'user-1'
    );

    expect(calls).toEqual(['a', 'b', 'c']);
    expect(res.success).toEqual(['a', 'b', 'c']);
    expect(res.failed).toEqual([]);
  });

  it('captures per-id failures without aborting whole batch', async () => {
    jest.spyOn(faasService, 'updateStatus').mockImplementation(async (id) => {
      if (id === 'b') throw new Error('boom');
      return { id };
    });

    const res = await faasService.batchUpdateStatus(
      ['a', 'b', 'c'],
      'pending-provincial',
      'ok',
      'user@example.com',
      'user-1'
    );

    expect(res.success).toEqual(['a', 'c']);
    expect(res.failed).toEqual([{ id: 'b', error: 'boom' }]);
  });
});
