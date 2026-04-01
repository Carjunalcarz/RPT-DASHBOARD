const { poolPromise } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');
const sql = require('mssql');

class RptTreeService {
  /**
   * Get RPT_TREE records with filtering, sorting, and pagination
   */
  async getAll({ page = 1, limit = 200, sortBy = 'TDN', sortOrder = 'ASC', filters = {} }) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      const request2 = pool.request();

      // Base query columns requested by user
      // REGION, PROV, CITY, DISTRICT, TDN, Prod_Code, Area, Tot_FB, Non_FB, FB, Age, Unit_Price, Market_Value, NFB_UnitPrice
      const columns = 'REGION, PROV, CITY, DISTRICT, TDN, Prod_Code, Area, Tot_FB, Non_FB, FB, Age, Unit_Price, Market_Value, NFB_UnitPrice';
      
      let query = `
        SELECT ${columns} FROM RPTAS_AGUSAN.dbo.RPT_TREE
        
        WHERE 1=1

      `;

      // Dynamic Filtering
      const filterableFields = ['TDN', 'Prod_Code'];
      
      Object.keys(filters).forEach(key => {
        if (filterableFields.includes(key) && filters[key]) {
          request.input(key, sql.VarChar, filters[key]);
          request2.input(key, sql.VarChar, filters[key]);
          query += ` AND ${key} = @${key}`;
        }
      });
      
      // Count total records for pagination
      // Need to reuse parameters for count query
      let countQuery = 'SELECT COUNT(*) as total FROM RPTAS_AGUSAN.dbo.RPT_TREE WHERE 1=1';
      Object.keys(filters).forEach(key => {
        if (filterableFields.includes(key) && filters[key]) {
          countQuery += ` AND ${key} = @${key}`;
        }
      });
      
      const totalCountResult = await request.query(countQuery);
      const total = totalCountResult.recordset[0].total;

      // Sorting and Pagination
      // MSSQL requires OFFSET FETCH for pagination with ORDER BY
      query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET ${(page - 1) * limit} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      logger.info(`Executing RPT_TREE getAll query`);
      
      const result = await request2.query(query);

      return {
        data: result.recordset,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in RptTreeService.getAll:', error);
      throw new AppError('Database query failed', 500);
    }
  }

  /**
   * Get trees by TDN (helper for direct fetch)
   */
  async getByTdn(tdn) {
    return this.getAll({ filters: { TDN: tdn } });
  }

  /**
   * Get tree reference library (joined with rates)
   */
  async getTreeLibrary() {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      
      const query = `
        SELECT 
             te.Region, 
             te.Prov, 
             te.City, 
             te.Code, 
             t.Description, 
             te.Eff_Date, 
             te.Rate, 
             te.NFB_Rate 
         FROM RPTAS_AGUSAN.dbo.TREES_EXTN te 
         INNER JOIN RPTAS_AGUSAN.dbo.TREES t 
             ON te.Code = t.Code;
      `;
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      logger.error('Error in RptTreeService.getTreeLibrary:', error);
      throw new AppError('Database query failed', 500);
    }
  }
}

module.exports = new RptTreeService();
