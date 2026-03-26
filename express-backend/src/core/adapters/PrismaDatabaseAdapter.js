const DatabaseAdapter = require('./DatabaseAdapter');

class PrismaDatabaseAdapter extends DatabaseAdapter {
  constructor({ logger, supabasePrisma, mssqlPrisma }) {
    super();
    this.logger = logger;
    this.supabasePrisma = supabasePrisma;
    this.mssqlPrisma = mssqlPrisma;
  }

  async connect() {
    try {
      // Custom clients are already instantiated, just do a simple query to test connection
      await this.supabasePrisma.$queryRaw`SELECT 1`;
      this.logger.info('Connected to Supabase Prisma database');
      
      // Optionally test MSSQL if needed, but keeping it simple for now
    } catch (error) {
      this.logger.error('Failed to connect to Prisma database', error);
      throw error;
    }
  }

  async disconnect() {
    // Usually handled by Prisma automatically, but we can call $disconnect
    await this.supabasePrisma.$disconnect();
    await this.mssqlPrisma.$disconnect();
  }

  getClient() {
    return this.supabasePrisma; // Default to Supabase for generic adapter usage
  }
}

module.exports = PrismaDatabaseAdapter;
