const { poolPromise } = require('../database/mssql');
const { sql } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class CityService {
  /**
   * Fetch all city/municipality records with pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.pageSize - Number of records per page (default: 100)
   * @param {string} params.search - Search term for description or code
   * @returns {Promise<Object>} Object containing data and pagination info
   */
  async getCities({ page = 1, pageSize = 100, search = '' } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      const offset = (page - 1) * pageSize;
      let searchCondition = '';
      
      if (search) {
        searchCondition = `WHERE DESCRIPTION LIKE '%' + @search + '%' OR CODE LIKE '%' + @search + '%'`;
      }

      // Count total records
      const countResult = await pool.request()
        .input('search', sql.NVarChar, search || '')
        .query(`
          SELECT COUNT(*) as total FROM dbo.CITY
          ${searchCondition}
        `);
      
      const total = countResult.recordset[0].total;

      // Fetch paginated records
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('pageSize', sql.Int, pageSize)
        .input('search', sql.NVarChar, search || '')
        .query(`
          SELECT * 
          FROM dbo.CITY
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
      logger.error('Error executing CITY query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }
}

module.exports = new CityService();