const { poolPromise } = require('../database/mssql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Service to handle MASTEXTN data operations
 */
class MastExtnService {
  /**
   * Fetch MASTEXTN records
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Number of records per page (default: 100)
   * @param {string} params.tdn - Filter by TDN
   * @returns {Promise<Object>} Object containing data and pagination info
   */
  async getMastExtnData({ page = 1, limit = 100, tdn } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Base query
      let baseQuery = `
        SELECT 
          REGION, PROV, CITY, DISTRICT, TDN, CANCELS, EFF_DATE, Pin, Pyear, 
          Pown_cd, Powner_no, Pmarket_val, Pass_value, pTree_Aval, CANCEL_EXT, 
          CANCARP, ARPEXT, PINEXT, AREA, IF_DEFAULT, PREV_DISTRICT, PREV_CITY, 
          OldTDN, Oldcancels 
        FROM MASTEXTN
        WHERE 1=1
      `;

      // Filter Logic
      if (tdn) {
        // Sanitize TDN to prevent basic SQL injection
        const sanitizedTdn = tdn.replace(/'/g, "''");
        baseQuery += ` AND TDN LIKE '%${sanitizedTdn}%'`;
      }

      // Order by TDN for consistent pagination
      baseQuery += ` ORDER BY TDN ASC`;

      // Execute query
      logger.info('Executing MASTEXTN query...');
      const result = await pool.request().query(baseQuery);
      const records = result.recordset;

      logger.info(`Query executed successfully. Records found: ${records.length}`);

      // Calculate pagination (in-memory for now, consistent with other services)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRecords = records.slice(startIndex, endIndex);

      return {
        data: paginatedRecords,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: records.length,
          totalPages: Math.ceil(records.length / limit)
        }
      };
    } catch (error) {
      logger.error('Error executing MASTEXTN query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }
}

module.exports = new MastExtnService();
