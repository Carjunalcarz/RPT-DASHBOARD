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
  async getBarangays({ page = 1, pageSize = 100, search = '', cityCode = '' } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      const offset = (page - 1) * pageSize;
      let conditions = [];
      
      if (search) {
        conditions.push(`(DESCRIPTION LIKE '%' + @search + '%' OR CODE LIKE '%' + @search + '%')`);
      }
      if (cityCode) {
        conditions.push(`CITY = @cityCode`);
      }

      const searchCondition = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countResult = await pool.request()
        .input('search', sql.NVarChar, search || '')
        .input('cityCode', sql.NVarChar, cityCode || '')
        .query(`
          SELECT COUNT(*) as total FROM dbo.BARANGAY
          ${searchCondition}
        `);
      
      const total = countResult.recordset[0].total;

      // Fetch paginated records
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('pageSize', sql.Int, pageSize)
        .input('search', sql.NVarChar, search || '')
        .input('cityCode', sql.NVarChar, cityCode || '')
        .query(`
          SELECT * 
          FROM dbo.BARANGAY
          ${searchCondition}
          ORDER BY DESCRIPTION ASC
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
