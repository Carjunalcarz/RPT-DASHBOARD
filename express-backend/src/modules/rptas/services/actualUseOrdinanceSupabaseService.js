const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class ActualUseOrdinanceSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS rptas;`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.mainclass_actualuse_setup (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          municipality_code VARCHAR(50) NOT NULL DEFAULT 'ALL',
          class_level VARCHAR(20) NOT NULL DEFAULT 'ALL',
          ordinance_no VARCHAR(100),
          date_approved DATE,
          mainclass_code VARCHAR(50) NOT NULL DEFAULT '',
          mainclass_name VARCHAR(255) NOT NULL DEFAULT '',
          actual_uses JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.actualuse_ordinances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          municipality_code VARCHAR(50) NOT NULL,
          class_level VARCHAR(20) NOT NULL,
          ordinance_no VARCHAR(100) NOT NULL,
          date_approved DATE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.actualuse_ordinances
          ALTER COLUMN municipality_code SET DEFAULT 'ALL';
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.actualuse_ordinances
          ALTER COLUMN class_level SET DEFAULT 'ALL';
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE rptas.actualuse_ordinances
        SET municipality_code = 'ALL'
        WHERE municipality_code IS NULL OR municipality_code = '';
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE rptas.actualuse_ordinances
        SET class_level = 'ALL'
        WHERE class_level IS NULL OR class_level = '';
      `);
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS rptas.actualuse_ordinances_class_no_key;
      `);
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS rptas.actualuse_ordinances_muni_class_no_key;
      `);
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS actualuse_ordinances_no_key;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS actualuse_ordinances_ctx_key
        ON rptas.actualuse_ordinances (municipality_code, class_level, ordinance_no);
      `);
      await prisma.$executeRawUnsafe(`
        DELETE FROM rptas.actualuse_ordinances a
        WHERE a.id NOT IN (
          SELECT DISTINCT ON (municipality_code, class_level, ordinance_no) id
          FROM rptas.actualuse_ordinances
          ORDER BY municipality_code, class_level, ordinance_no, date_approved DESC, updated_at DESC
        );
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO rptas.actualuse_ordinances (municipality_code, class_level, ordinance_no, date_approved, updated_at)
        SELECT
          municipality_code,
          class_level,
          ordinance_no,
          MAX(date_approved) AS date_approved,
          NOW() AS updated_at
        FROM rptas.mainclass_actualuse_setup
        WHERE ordinance_no IS NOT NULL
          AND ordinance_no <> ''
          AND date_approved IS NOT NULL
        GROUP BY municipality_code, class_level, ordinance_no
        ON CONFLICT (municipality_code, class_level, ordinance_no)
        DO UPDATE SET
          date_approved = EXCLUDED.date_approved,
          updated_at = NOW();
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.actualuse_ordinances table exists:', error);
      throw error;
    }
  }

  async list(municipalityCode, classLevel) {
    await this.ensureTableExists();
    try {
      const muni = municipalityCode ? String(municipalityCode).trim() : null;
      const level = classLevel ? String(classLevel).trim() : null;
      const rows =
        muni && level
          ? await prisma.$queryRawUnsafe(
              `
                SELECT id, municipality_code, class_level, ordinance_no, date_approved, created_at, updated_at
                FROM rptas.actualuse_ordinances
                WHERE (municipality_code = 'ALL' OR municipality_code = $1)
                  AND (class_level = 'ALL' OR class_level = $2)
                ORDER BY date_approved DESC, ordinance_no ASC
              `,
              muni,
              level
            )
          : await prisma.$queryRawUnsafe(
              `
                SELECT id, municipality_code, class_level, ordinance_no, date_approved, created_at, updated_at
                FROM rptas.actualuse_ordinances
                ORDER BY date_approved DESC, ordinance_no ASC
              `
            );
      return rows;
    } catch (error) {
      logger.error('Error fetching actual use ordinances:', error);
      throw error;
    }
  }

  async upsert(municipalityCode, classLevel, ordinanceNo, dateApproved) {
    await this.ensureTableExists();
    const muni = String(municipalityCode || '').trim() || 'ALL';
    const level = String(classLevel || '').trim() || 'ALL';
    const ord = String(ordinanceNo || '').trim();
    const date = String(dateApproved || '').trim();

    try {
      const rows = await prisma.$queryRawUnsafe(
        `
          INSERT INTO rptas.actualuse_ordinances (municipality_code, class_level, ordinance_no, date_approved, updated_at)
          VALUES ($1, $2, $3, $4::date, NOW())
          ON CONFLICT (municipality_code, class_level, ordinance_no)
          DO UPDATE SET
            date_approved = EXCLUDED.date_approved,
            updated_at = NOW()
          RETURNING id, municipality_code, class_level, ordinance_no, date_approved, created_at, updated_at
        `,
        muni,
        level,
        ord,
        date
      );
      return rows[0];
    } catch (error) {
      logger.error('Error upserting actual use ordinance:', error);
      throw error;
    }
  }

  async delete(id) {
    await this.ensureTableExists();
    try {
      await prisma.$queryRawUnsafe(
        `
          DELETE FROM rptas.actualuse_ordinances
          WHERE id = $1::uuid
        `,
        id
      );
      return true;
    } catch (error) {
      logger.error('Error deleting actual use ordinance:', error);
      throw error;
    }
  }
}

module.exports = new ActualUseOrdinanceSupabaseService();
