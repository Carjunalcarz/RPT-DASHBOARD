const { poolPromise } = require('../database/mssql');
const { sql } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class ActualUseService {
  /**
   * Fetch all actual use records with pagination and search
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.pageSize - Number of records per page (default: 100)
   * @param {string} params.search - Search term for description or code
   * @param {string} params.mainClass - Filter by MainClass code
   * @returns {Promise<Object>} Object containing data and pagination info
   */
  async getActualUses({ page = 1, pageSize = 100, search = '', mainClass = '' } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      const offset = (page - 1) * pageSize;
      let conditions = [];
      
      if (search) {
        conditions.push(`(Description LIKE '%' + @search + '%' OR Code LIKE '%' + @search + '%')`);
      }
      
      if (mainClass) {
        conditions.push(`MainClass = @mainClass`);
      }

      const searchCondition = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total records
      const countResult = await pool.request()
        .input('search', sql.NVarChar, search || '')
        .input('mainClass', sql.NVarChar, mainClass || '')
        .query(`
          SELECT COUNT(*) as total FROM (
            SELECT DISTINCT MainClass, Code, Description
            FROM dbo.ACTUALUSE
            ${searchCondition}
          ) as distinct_actualuse
        `);
      
      const total = countResult.recordset[0].total;

      // Fetch paginated records
      const result = await pool.request()
        .input('offset', sql.Int, offset)
        .input('pageSize', sql.Int, pageSize)
        .input('search', sql.NVarChar, search || '')
        .input('mainClass', sql.NVarChar, mainClass || '')
        .query(`
          SELECT MainClass, Code, Description 
          FROM (
            SELECT DISTINCT MainClass, Code, Description 
            FROM dbo.ACTUALUSE
            ${searchCondition}
          ) as distinct_actualuse
          ORDER BY MainClass ASC, Code ASC
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
      logger.error('Error executing ACTUALUSE query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }
}

module.exports = new ActualUseService();