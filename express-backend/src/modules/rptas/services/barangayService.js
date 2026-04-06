const { poolPromise } = require('../database/mssql');
const { sql } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class BarangayService {
  /**
   * Fetch all barangay records with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.pageSize - Number of records per page (default: 100)
   * @returns {Promise<Object>} Object containing data and pagination info
   */
  async getBarangays({ page = 1, pageSize = 100 } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      const offset = (page - 1) * pageSize;

      // Count total records
      const countResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM dbo.BARANGAY
      `);
      
      const total = countResult.recordset[0].total;

      // Fetch paginated records
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('pageSize', sql.Int, pageSize)
        .query(`
          SELECT * 
          FROM dbo.BARANGAY
          ORDER BY (SELECT NULL)
          OFFSET @offset ROWS 
          FETCH NEXT @pageSize ROWS ONLY
        `);

      const records = result.recordset;

      return {
        data: records,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total: total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      logger.error('Error executing BARANGAY query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }
}

module.exports = new BarangayService();
