const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class MainClassCustomSupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS rptas;`);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.main_class_custom (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) NOT NULL,
          description VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS main_class_custom_code_key
        ON rptas.main_class_custom (code);
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.main_class_custom table exists:', error);
      throw error;
    }
  }

  async list({ search = '' } = {}) {
    await this.ensureTableExists();
    const q = String(search || '').trim();

    try {
      if (!q) {
        return await prisma.$queryRawUnsafe(
          `
            SELECT id, code, description, created_at, updated_at
            FROM rptas.main_class_custom
            ORDER BY code ASC
          `
        );
      }

      return await prisma.$queryRawUnsafe(
        `
          SELECT id, code, description, created_at, updated_at
          FROM rptas.main_class_custom
          WHERE code ILIKE $1 OR description ILIKE $1
          ORDER BY code ASC
        `,
        `%${q}%`
      );
    } catch (error) {
      logger.error('Error fetching custom main classes:', error);
      throw error;
    }
  }

  async upsert(code, description) {
    await this.ensureTableExists();
    const c = String(code || '').trim().toUpperCase();
    const d = String(description || '').trim();

    try {
      const rows = await prisma.$queryRawUnsafe(
        `
          INSERT INTO rptas.main_class_custom (code, description, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (code)
          DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, code, description, created_at, updated_at
        `,
        c,
        d
      );
      return rows[0];
    } catch (error) {
      logger.error('Error upserting custom main class:', error);
      throw error;
    }
  }

  async deleteByCode(code) {
    await this.ensureTableExists();
    const c = String(code || '').trim().toUpperCase();
    try {
      await prisma.$queryRawUnsafe(
        `
          DELETE FROM rptas.main_class_custom
          WHERE code = $1
        `,
        c
      );
      return true;
    } catch (error) {
      logger.error('Error deleting custom main class:', error);
      throw error;
    }
  }
}

module.exports = new MainClassCustomSupabaseService();
