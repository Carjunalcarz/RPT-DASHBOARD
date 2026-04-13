const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class ClassificationRateSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.classification_rates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          rate NUMERIC(18, 6),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.classification_rates table exists:', error);
      throw error;
    }
  }

  async getAll() {
    await this.ensureTableExists();
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT id, code, name, rate, created_at, updated_at
        FROM rptas.classification_rates
        ORDER BY code ASC
      `);
      return rows;
    } catch (error) {
      logger.error('Error fetching classification rates:', error);
      throw error;
    }
  }

  async upsert(code, name, rate) {
    await this.ensureTableExists();
    try {
      const normalizedRate = rate === null || rate === undefined || rate === '' ? null : Number(rate);
      const rows = await prisma.$queryRawUnsafe(
        `
          INSERT INTO rptas.classification_rates (code, name, rate, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (code)
          DO UPDATE SET
            name = EXCLUDED.name,
            rate = EXCLUDED.rate,
            updated_at = NOW()
          RETURNING id, code, name, rate, created_at, updated_at
        `,
        code,
        name,
        normalizedRate
      );
      return rows[0];
    } catch (error) {
      logger.error('Error upserting classification rate:', error);
      throw error;
    }
  }

  async delete(id) {
    await this.ensureTableExists();
    try {
      await prisma.$queryRawUnsafe(
        `
          DELETE FROM rptas.classification_rates
          WHERE id = $1::uuid
        `,
        id
      );
      return true;
    } catch (error) {
      logger.error('Error deleting classification rate:', error);
      throw error;
    }
  }
}

module.exports = new ClassificationRateSupabaseService();

