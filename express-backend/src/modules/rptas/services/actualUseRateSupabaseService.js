const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class ActualUseRateSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.actual_use_rates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mainclass_code VARCHAR(50) NOT NULL,
          actualuse_code VARCHAR(50) NOT NULL,
          actualuse_name VARCHAR(255) NOT NULL,
          rate NUMERIC(18, 6),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (mainclass_code, actualuse_code)
        );
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.actual_use_rates table exists:', error);
      throw error;
    }
  }

  async getAll() {
    await this.ensureTableExists();
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT id, mainclass_code, actualuse_code, actualuse_name, rate, created_at, updated_at
        FROM rptas.actual_use_rates
        ORDER BY mainclass_code ASC, actualuse_code ASC
      `);
      return rows;
    } catch (error) {
      logger.error('Error fetching actual use rates:', error);
      throw error;
    }
  }

  async upsert(mainclassCode, actualUseCode, actualUseName, rate) {
    await this.ensureTableExists();
    try {
      const normalizedRate = rate === null || rate === undefined || rate === '' ? null : Number(rate);
      const rows = await prisma.$queryRawUnsafe(
        `
          INSERT INTO rptas.actual_use_rates (mainclass_code, actualuse_code, actualuse_name, rate, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (mainclass_code, actualuse_code)
          DO UPDATE SET
            actualuse_name = EXCLUDED.actualuse_name,
            rate = EXCLUDED.rate,
            updated_at = NOW()
          RETURNING id, mainclass_code, actualuse_code, actualuse_name, rate, created_at, updated_at
        `,
        mainclassCode,
        actualUseCode,
        actualUseName,
        normalizedRate
      );
      return rows[0];
    } catch (error) {
      logger.error('Error upserting actual use rate:', error);
      throw error;
    }
  }

  async delete(id) {
    await this.ensureTableExists();
    try {
      await prisma.$queryRawUnsafe(
        `
          DELETE FROM rptas.actual_use_rates
          WHERE id = $1::uuid
        `,
        id
      );
      return true;
    } catch (error) {
      logger.error('Error deleting actual use rate:', error);
      throw error;
    }
  }
}

module.exports = new ActualUseRateSupabaseService();

