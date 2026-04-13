const { poolPromise } = require('../database/mssql');
const { sql } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class ClassificationService {
  async getClassifications() {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      const result = await pool.request().query(`
        SELECT * FROM dbo.CLASSIFICATION
        ORDER BY Code ASC
      `);

      return {
        data: result.recordset
      };
    } catch (error) {
      logger.error('Error executing CLASSIFICATION query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }

  async getClassificationByCode(code) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('code', sql.NVarChar, code)
        .query(`
          SELECT * FROM dbo.CLASSIFICATION
          WHERE Code = @code
        `);
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('Error executing CLASSIFICATION query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }
}

module.exports = new ClassificationService();