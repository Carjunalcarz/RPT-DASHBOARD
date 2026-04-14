const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class MainclassActualUseSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE SCHEMA IF NOT EXISTS rptas;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.mainclass_actualuse_setup (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          municipality_code VARCHAR(50),
          class_level VARCHAR(20),
          mainclass_code VARCHAR(50) NOT NULL,
          mainclass_name VARCHAR(255) NOT NULL,
          actual_uses JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          ADD COLUMN IF NOT EXISTS municipality_code VARCHAR(50);
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          ADD COLUMN IF NOT EXISTS class_level VARCHAR(20);
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          ADD COLUMN IF NOT EXISTS ordinance_no VARCHAR(100);
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          ADD COLUMN IF NOT EXISTS date_approved DATE;
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE rptas.mainclass_actualuse_setup
        SET municipality_code = COALESCE(municipality_code, 'ALL')
        WHERE municipality_code IS NULL;
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE rptas.mainclass_actualuse_setup
        SET class_level = COALESCE(class_level, 'ALL')
        WHERE class_level IS NULL;
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          ALTER COLUMN municipality_code SET NOT NULL;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          ALTER COLUMN class_level SET NOT NULL;
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE rptas.mainclass_actualuse_setup
          DROP CONSTRAINT IF EXISTS mainclass_actualuse_setup_mainclass_code_key;
      `);

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS mainclass_actualuse_setup_muni_class_mainclass_key
        ON rptas.mainclass_actualuse_setup (municipality_code, class_level, mainclass_code);
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.mainclass_actualuse_setup table exists:', error);
      throw error;
    }
  }

  async getAllSetups(municipalityCode, classLevel, ordinanceNo) {
    await this.ensureTableExists();
    try {
      if (municipalityCode && classLevel && ordinanceNo) {
        const rows = await prisma.$queryRawUnsafe(`
          SELECT id, municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, created_at, updated_at
          FROM rptas.mainclass_actualuse_setup
          WHERE municipality_code = $1 AND class_level = $2 AND ordinance_no = $3
          ORDER BY mainclass_name ASC
        `, municipalityCode, classLevel, ordinanceNo);
        return rows;
      }

      if (municipalityCode && classLevel) {
        const rows = await prisma.$queryRawUnsafe(`
          SELECT id, municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, created_at, updated_at
          FROM rptas.mainclass_actualuse_setup
          WHERE municipality_code = $1 AND class_level = $2
          ORDER BY mainclass_name ASC
        `, municipalityCode, classLevel);
        return rows;
      }

      const rows = await prisma.$queryRawUnsafe(`
          SELECT id, municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, created_at, updated_at
          FROM rptas.mainclass_actualuse_setup
          ORDER BY municipality_code ASC, class_level ASC, mainclass_name ASC
        `);
      return rows;
    } catch (error) {
      logger.error('Error fetching mainclass actual uses setups:', error);
      throw error;
    }
  }

  async getSetupByMainClass(municipalityCode, classLevel, mainClassCode, ordinanceNo) {
    await this.ensureTableExists();
    try {
      const rows = ordinanceNo
        ? await prisma.$queryRawUnsafe(`
          SELECT id, municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, created_at, updated_at
          FROM rptas.mainclass_actualuse_setup
          WHERE municipality_code = $1 AND class_level = $2 AND mainclass_code = $3 AND ordinance_no = $4
          LIMIT 1
        `, municipalityCode, classLevel, mainClassCode, ordinanceNo)
        : await prisma.$queryRawUnsafe(`
          SELECT id, municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, created_at, updated_at
          FROM rptas.mainclass_actualuse_setup
          WHERE municipality_code = $1 AND class_level = $2 AND mainclass_code = $3
          LIMIT 1
        `, municipalityCode, classLevel, mainClassCode);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('Error fetching setup by main class code:', error);
      throw error;
    }
  }

  async upsertSetup(municipalityCode, classLevel, ordinanceNo, dateApproved, mainClassCode, mainClassName, actualUses) {
    await this.ensureTableExists();
    try {
      const actualUsesJson = JSON.stringify(actualUses || []);
      
      const rows = await prisma.$queryRawUnsafe(`
        INSERT INTO rptas.mainclass_actualuse_setup (municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, updated_at)
        VALUES ($1, $2, $3, $4::date, $5, $6, $7::jsonb, NOW())
        ON CONFLICT (municipality_code, class_level, mainclass_code) 
        DO UPDATE SET 
          ordinance_no = EXCLUDED.ordinance_no,
          date_approved = EXCLUDED.date_approved,
          mainclass_name = EXCLUDED.mainclass_name,
          actual_uses = EXCLUDED.actual_uses,
          updated_at = NOW()
        RETURNING id, municipality_code, class_level, ordinance_no, date_approved, mainclass_code, mainclass_name, actual_uses, created_at, updated_at
      `, municipalityCode, classLevel, ordinanceNo, dateApproved, mainClassCode, mainClassName, actualUsesJson);
      
      return rows[0];
    } catch (error) {
      logger.error('Error upserting mainclass actual use setup:', error);
      throw error;
    }
  }

  async deleteSetup(id) {
    await this.ensureTableExists();
    try {
      await prisma.$queryRawUnsafe(`
        DELETE FROM rptas.mainclass_actualuse_setup
        WHERE id = $1::uuid
      `, id);
      return true;
    } catch (error) {
      logger.error('Error deleting setup:', error);
      throw error;
    }
  }

  async listDistinctMainClasses() {
    await this.ensureTableExists();
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT ON (mainclass_code) mainclass_code, mainclass_name
        FROM rptas.mainclass_actualuse_setup
        ORDER BY mainclass_code ASC, updated_at DESC
      `);
      return rows;
    } catch (error) {
      logger.error('Error fetching distinct main classes:', error);
      throw error;
    }
  }
}

module.exports = new MainclassActualUseSupabaseService();
