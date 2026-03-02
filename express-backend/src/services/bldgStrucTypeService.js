const { poolPromise } = require('../database/mssql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class BldgStrucTypeService {
  /**
   * Get all building structure types with optional filtering
   * @param {Object} params 
   */
  async getAll({ page = 1, limit = 100, code, city }) {
    try {
      const pool = await poolPromise;
      if (!pool) throw new Error('Database connection failed');

      let query = `
        SELECT Code, Description, EFF_DATE, REGION, PROV, CITY, Struc_Desc, Struc_Part, DEC_DATE
        FROM RPTAS_AGUSAN.dbo.BLDG_STRUCTYPE
        WHERE 1=1
      `;

      if (code) {
        query += ` AND Code = @code`;
      }

      if (city) {
        query += ` AND CITY = @city`;
      }

      query += ` ORDER BY Code`;

      // Pagination
      const offset = (page - 1) * limit;
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      const request = pool.request();
      if (code) request.input('code', code);
      if (city) request.input('city', city);

      const result = await request.query(query);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM RPTAS_AGUSAN.dbo.BLDG_STRUCTYPE
        WHERE 1=1
      `;
      if (code) countQuery += ` AND Code = @code`;
      if (city) countQuery += ` AND CITY = @city`;
      
      const countRequest = pool.request();
      if (code) countRequest.input('code', code);
      if (city) countRequest.input('city', city);
      
      const countResult = await countRequest.query(countQuery);
      const total = countResult.recordset[0].total;

      return {
        success: true,
        data: result.recordset,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error in BldgStrucTypeService.getAll:', error);
      throw new AppError(error.message, 500);
    }
  }
}

module.exports = new BldgStrucTypeService();