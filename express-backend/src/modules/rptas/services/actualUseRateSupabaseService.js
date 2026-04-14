const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class ActualUseRateSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.actual_use_rates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          municipality_code VARCHAR(50) NOT NULL DEFAULT 'ALL',
          class_level VARCHAR(50) NOT NULL DEFAULT 'ALL',
          ordinance_no VARCHAR(100) NOT NULL DEFAULT 'ALL',
          mainclass_code VARCHAR(50) NOT NULL,
          actualuse_code VARCHAR(50) NOT NULL,
          actualuse_name VARCHAR(255) NOT NULL,
          rate NUMERIC(18, 6),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code)
        );
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.actual_use_rates
          ADD COLUMN IF NOT EXISTS municipality_code VARCHAR(50) NOT NULL DEFAULT 'ALL';
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.actual_use_rates
          ADD COLUMN IF NOT EXISTS class_level VARCHAR(50) NOT NULL DEFAULT 'ALL';
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.actual_use_rates
          ADD COLUMN IF NOT EXISTS ordinance_no VARCHAR(100) NOT NULL DEFAULT 'ALL';
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.actual_use_rates
          DROP CONSTRAINT IF EXISTS actual_use_rates_mainclass_code_actualuse_code_key;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS actual_use_rates_ctx_key
          ON rptas.actual_use_rates (municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code);
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.actual_use_rates table exists:', error);
      throw error;
    }
  }

  async getAll(filters = {}) {
    await this.ensureTableExists();
    try {
      const municipalityCode = filters?.municipalityCode ? String(filters.municipalityCode).trim() : null;
      const classLevel = filters?.classLevel ? String(filters.classLevel).trim() : null;
      const ordinanceNo = filters?.ordinanceNo ? String(filters.ordinanceNo).trim() : null;
      const mainClassCode = filters?.mainClassCode ? String(filters.mainClassCode).trim() : null;

      if (municipalityCode && classLevel && ordinanceNo) {
        const rows = await prisma.$queryRawUnsafe(
          `
            SELECT id, municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code, actualuse_name, rate, created_at, updated_at
            FROM rptas.actual_use_rates
            WHERE municipality_code = $1 AND class_level = $2 AND ordinance_no = $3
              AND ($4::text IS NULL OR mainclass_code = $4)
            ORDER BY mainclass_code ASC, actualuse_code ASC
          `,
          municipalityCode,
          classLevel,
          ordinanceNo,
          mainClassCode
        );
        return rows;
      }

      const rows = await prisma.$queryRawUnsafe(
        `
          SELECT id, municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code, actualuse_name, rate, created_at, updated_at
          FROM rptas.actual_use_rates
          ORDER BY municipality_code ASC, class_level ASC, ordinance_no ASC, mainclass_code ASC, actualuse_code ASC
        `
      );
      return rows;
    } catch (error) {
      logger.error('Error fetching actual use rates:', error);
      throw error;
    }
  }

  async upsert(municipalityCode, classLevel, ordinanceNo, mainclassCode, actualUseCode, actualUseName, rate) {
    await this.ensureTableExists();
    try {
      const normalizedRate = rate === null || rate === undefined || rate === '' ? null : Number(rate);
      const rows = await prisma.$queryRawUnsafe(
        `
          INSERT INTO rptas.actual_use_rates (municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code, actualuse_name, rate, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code)
          DO UPDATE SET
            actualuse_name = EXCLUDED.actualuse_name,
            rate = EXCLUDED.rate,
            updated_at = NOW()
          RETURNING id, municipality_code, class_level, ordinance_no, mainclass_code, actualuse_code, actualuse_name, rate, created_at, updated_at
        `,
        municipalityCode,
        classLevel,
        ordinanceNo,
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
