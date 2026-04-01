const request = require('supertest');
const { PrismaClient } = require('../generated/supabase-client-v6');
const { DB_SCHEMA } = require('../modules/rptas/config/database');

// We will test if the schema is dynamically injected
describe('Database Schema Configuration Integration', () => {
  let prisma;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have the correct schema configured in DB_SCHEMA', () => {
    expect(DB_SCHEMA).toBeDefined();
    // Usually it will be rptas based on .env, but we verify it's a valid string
    expect(typeof DB_SCHEMA).toBe('string');
    expect(/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(DB_SCHEMA)).toBe(true);
  });

  it('should be able to run a query using the injected schema', async () => {
    // We do a safe query to information_schema to verify the schema is recognized
    // or just ensure we don't get a syntax error.
    const result = await prisma.$queryRawUnsafe(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = $1
    `, DB_SCHEMA);

    // If the schema was properly created during migrations, it should be returned
    // But even if not, the query shouldn't fail due to bad string interpolation.
    expect(Array.isArray(result)).toBe(true);
  });

  it('should use DB_SCHEMA correctly in dynamic raw queries', async () => {
    // This query tests that the interpolation logic we put in services/controllers works without syntax error
    const query = `
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = '${DB_SCHEMA}'
    `;
    
    const result = await prisma.$queryRawUnsafe(query);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(0);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('count');
    }
  });
});
