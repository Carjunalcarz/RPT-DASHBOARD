const { poolPromise } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');
const sql = require('mssql');

class RptMachService {
  /**
   * Get RPT_MACH records with filtering, sorting, and pagination
   */
  async getAll({ page = 1, limit = 200, sortBy = 'Tdn', sortOrder = 'ASC', filters = {} }) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      const request2 = pool.request();

      // Base query columns requested by user
      const columns = `
        REGION, PROV, CITY, DISTRICT, Tdn, KIND, Classification, Actual_use, SubClass, Code, 
        Brand_Model, Capacity, D_acquired, D_installed, D_operated, Condition, Est_life, Rem_life, 
        No_units, Acq_cost, Rep_cost, Freight, Insurance, Installation, Others, Market_val, 
        Depreciation, Dep_market, StraightDep, Salvage, Acquisition_DPVal, Appraisal_DPVal, 
        SERIALNO, PurchaseType, Conv_Factor, Adj_Mvalue, IncludeUnitCnt, Orig_Cost, MachineDesc, 
        Sub_Tdn, UM, Disposal_Mvalue, NoYrs
      `;
      
      let query = `
        SELECT ${columns} FROM RPTAS_AGUSAN.dbo.RPT_MACH
        WHERE 1=1
      `;

      // Dynamic Filtering
      const filterableFields = ['Tdn', 'KIND', 'Classification', 'MachineDesc'];
      
      Object.keys(filters).forEach(key => {
        if (filterableFields.includes(key) && filters[key]) {
          request.input(key, sql.VarChar, filters[key]);
          request2.input(key, sql.VarChar, filters[key]);
          
          if (key === 'MachineDesc') {
            query += ` AND ${key} LIKE @${key}`;
          } else {
            query += ` AND ${key} = @${key}`;
          }
        }
      });
      
      // Count total records for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM RPTAS_AGUSAN.dbo.RPT_MACH WHERE 1=1';
      Object.keys(filters).forEach(key => {
        if (filterableFields.includes(key) && filters[key]) {
          if (key === 'MachineDesc') {
            countQuery += ` AND ${key} LIKE @${key}`;
          } else {
            countQuery += ` AND ${key} = @${key}`;
          }
        }
      });
      
      const totalCountResult = await request.query(countQuery);
      const total = totalCountResult.recordset[0].total;

      // Sorting and Pagination
      query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET ${(page - 1) * limit} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      logger.info(`Executing RPT_MACH getAll query`);
      
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
      logger.error('Error in RptMachService.getAll:', error);
      throw new AppError('Database query failed', 500);
    }
  }

  /**
   * Get machinery by TDN
   */
  async getByTdn(tdn) {
    return this.getAll({ filters: { Tdn: tdn } });
  }
}

module.exports = new RptMachService();
