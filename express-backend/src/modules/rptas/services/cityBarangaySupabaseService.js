const { supabasePrisma: prisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

class CityBarangaySupabaseService {
  async ensureTableExists() {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS rptas.city_barangays (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          city_code VARCHAR(50) NOT NULL UNIQUE,
          city_name VARCHAR(255) NOT NULL,
          barangays JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } catch (error) {
      logger.error('Error ensuring rptas.city_barangays table exists:', error);
      throw error;
    }
  }

  async getAllAssignments() {
    await this.ensureTableExists();
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT id, city_code, city_name, barangays, created_at, updated_at
        FROM rptas.city_barangays
        ORDER BY city_name ASC
      `);
      return rows;
    } catch (error) {
      logger.error('Error fetching city barangays:', error);
      throw error;
    }
  }

  async getAssignmentByCityCode(cityCode) {
    await this.ensureTableExists();
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT id, city_code, city_name, barangays, created_at, updated_at
        FROM rptas.city_barangays
        WHERE city_code = $1
        LIMIT 1
      `, cityCode);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      logger.error('Error fetching city barangay by code:', error);
      throw error;
    }
  }

  async upsertAssignment(cityCode, cityName, barangays) {
    await this.ensureTableExists();
    try {
      // Ensure barangays is an array of strings
      const barangaysJson = JSON.stringify(barangays || []);
      
      const rows = await prisma.$queryRawUnsafe(`
        INSERT INTO rptas.city_barangays (city_code, city_name, barangays, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (city_code) 
        DO UPDATE SET 
          city_name = EXCLUDED.city_name,
          barangays = EXCLUDED.barangays,
          updated_at = NOW()
        RETURNING id, city_code, city_name, barangays, created_at, updated_at
      `, cityCode, cityName, barangaysJson);
      
      return rows[0];
    } catch (error) {
      logger.error('Error upserting city barangay:', error);
      throw error;
    }
  }

  async deleteAssignment(id) {
    await this.ensureTableExists();
    try {
      await prisma.$queryRawUnsafe(`
        DELETE FROM rptas.city_barangays
        WHERE id = $1::uuid
      `, id);
      return true;
    } catch (error) {
      logger.error('Error deleting city barangay:', error);
      throw error;
    }
  }
}

module.exports = new CityBarangaySupabaseService();