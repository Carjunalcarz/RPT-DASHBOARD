const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class ActualUseCustomSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS rptas;`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.actual_use_custom (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mainclass_code VARCHAR(50) NOT NULL,
          code VARCHAR(50) NOT NULL,
          description VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS actual_use_custom_mainclass_code_key
        ON rptas.actual_use_custom (mainclass_code, code);
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.actual_use_custom table exists:', error);
      throw error;
    }
  }

  async list({ search = '', mainClass = '' } = {}) {
    await this.ensureTableExists();
    const q = String(search || '').trim();
    const main = String(mainClass || '').trim();

    try {
      const conditions = [];
      const args = [];
      let i = 1;

      if (main) {
        conditions.push(`mainclass_code = $${i}`);
        args.push(main);
        i += 1;
      }

      if (q) {
        conditions.push(`(code ILIKE $${i} OR description ILIKE $${i})`);
        args.push(`%${q}%`);
        i += 1;
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = await prisma.$queryRawUnsafe(
        `
          SELECT id, mainclass_code, code, description, created_at, updated_at
          FROM rptas.actual_use_custom
          ${whereSql}
          ORDER BY mainclass_code ASC, code ASC
        `,
        ...args
      );
      return rows;
    } catch (error) {
      logger.error('Error fetching custom actual uses:', error);
      throw error;
    }
  }

  async upsert(mainClassCode, code, description) {
    await this.ensureTableExists();
    const main = String(mainClassCode || '').trim();
    const c = String(code || '').trim();
    const d = String(description || '').trim();

    try {
      const rows = await prisma.$queryRawUnsafe(
        `
          INSERT INTO rptas.actual_use_custom (mainclass_code, code, description, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (mainclass_code, code)
          DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, mainclass_code, code, description, created_at, updated_at
        `,
        main,
        c,
        d
      );
      return rows[0];
    } catch (error) {
      logger.error('Error upserting custom actual use:', error);
      throw error;
    }
  }

  async deleteById(id) {
    await this.ensureTableExists();
    const uuid = String(id || '').trim();
    try {
      await prisma.$queryRawUnsafe(
        `
          DELETE FROM rptas.actual_use_custom
          WHERE id = $1::uuid
        `,
        uuid
      );
      return true;
    } catch (error) {
      logger.error('Error deleting custom actual use:', error);
      throw error;
    }
  }
}

module.exports = new ActualUseCustomSupabaseService();
