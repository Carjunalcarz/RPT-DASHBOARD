const { poolPromise } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class BldgUnitCostService {
  /**
   * Get all building unit costs with optional filtering
   * @param {Object} params 
   */
  async getAll({ page = 1, limit = 100, strucType, bldgCode, city }) {
    try {
      const pool = await poolPromise;
      if (!pool) throw new Error('Database connection failed');

      let query = `
        SELECT 
          u.Region, 
          u.Prov, 
          u.City, 
          u.StrucType, 
          u.BldgCode, 
          u.UNIT_VALUE, 
          u.Eff_Date,
          c.Description AS BldgCodeDesc
        FROM RPTAS_AGUSAN.dbo.BLDG_UNITCOST u
        LEFT JOIN RPTAS_AGUSAN.dbo.BLDG_CODE c ON u.BldgCode = c.Code
        WHERE 1=1
      `;

      if (strucType) {
        query += ` AND u.StrucType = @strucType`;
      }

      if (bldgCode) {
        query += ` AND u.BldgCode = @bldgCode`;
      }

      if (city) {
        query += ` AND u.City = @city`;
      }

      query += ` ORDER BY u.StrucType, u.BldgCode`;

      // Simple pagination
      const offset = (page - 1) * limit;
      // SQL Server 2012+ offset fetch
      // If older version, might need TOP/ROW_NUMBER approach
      // Assuming modern SQL Server
      query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      const request = pool.request();
      if (strucType) request.input('strucType', strucType);
      if (bldgCode) request.input('bldgCode', bldgCode);
      if (city) request.input('city', city);

      const result = await request.query(query);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM RPTAS_AGUSAN.dbo.BLDG_UNITCOST u
        WHERE 1=1
      `;
      if (strucType) countQuery += ` AND u.StrucType = @strucType`;
      if (bldgCode) countQuery += ` AND u.BldgCode = @bldgCode`;
      if (city) countQuery += ` AND u.City = @city`;
      
      const countRequest = pool.request();
      if (strucType) countRequest.input('strucType', strucType);
      if (bldgCode) countRequest.input('bldgCode', bldgCode);
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
      logger.error('Error in BldgUnitCostService.getAll:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Get specific unit cost
   */
  async getUnitCost(strucType, bldgCode, city) {
    try {
      const pool = await poolPromise;
      const request = pool.request()
        .input('strucType', strucType)
        .input('bldgCode', bldgCode);

      let query = `
          SELECT TOP 1 
            u.Region, 
            u.Prov, 
            u.City, 
            u.StrucType, 
            u.BldgCode, 
            u.UNIT_VALUE, 
            u.Eff_Date,
            c.Description AS BldgCodeDesc
          FROM RPTAS_AGUSAN.dbo.BLDG_UNITCOST u
          LEFT JOIN RPTAS_AGUSAN.dbo.BLDG_CODE c ON u.BldgCode = c.Code
          WHERE u.StrucType = @strucType AND u.BldgCode = @bldgCode
        `;

      if (city) {
        query += ` AND u.City = @city`;
        request.input('city', city);
      } else {
        // If city is not provided, maybe prioritize a default or specific logic?
        // For now, if no city provided, it might return any match.
      }

      const result = await request.query(query);
      
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('Error in BldgUnitCostService.getUnitCost:', error);
      throw new AppError(error.message, 500);
    }
  }
}

module.exports = new BldgUnitCostService();