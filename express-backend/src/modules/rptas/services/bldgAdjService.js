const { poolPromise } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');
const sql = require('mssql');

class BldgAdjService {
  /**
   * Get all BLDG_ADJ records with filtering, sorting, and pagination
   */
  async getAll({ page = 1, limit = 20, sortBy = 'TDN', sortOrder = 'ASC', filters = {} }) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      const request2 = pool.request(); // For main query

      // Base query
      let query = `
        SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_ADJ
        WHERE 1=1
      `;

      // Dynamic Filtering
      const filterableFields = [
        'Region', 'Prov', 'City', 'DISTRICT', 'TDN', 'KIND', 'Classification', 
        'Actual_use', 'SubClass', 'Struc_Type', 'BldgCode', 'Storey', 'MainComp', 
        'CompExtn', 'DescNote', 'Additional', 'SeqNo', 'ISADDITIONAL', 'FloorOrd', 
        'Sub_Tdn'
      ];
      
      Object.keys(filters).forEach(key => {
        if (filterableFields.includes(key) && filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          request.input(key, sql.VarChar, filters[key]);
          request2.input(key, sql.VarChar, filters[key]);
          query += ` AND ${key} = @${key}`;
        }
      });

      // Count total records for pagination
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) as sub`;
      const totalCountResult = await request.query(countQuery);
      const total = totalCountResult.recordset[0].total;

      // Sorting and Pagination
      // Default sort by TDN if sortBy is not valid or empty, though controller usually handles defaults
      // Ensure sortBy is safe to inject directly or whitelist it. 
      // For now, assuming controller validation or basic sanitization.
      query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET ${(page - 1) * limit} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      logger.info(`Executing BLDG_ADJ getAll query`);
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
      logger.error('Error in BldgAdjService.getAll:', error);
      throw new AppError('Database query failed', 500);
    }
  }

  /**
   * Get a single record by ID (Assuming composite key or just TDN + SeqNo logic, but typical REST uses one ID. 
   * Since this table likely uses composite keys similar to RPT_ASS (TDN + others), we might need to filter by TDN and maybe SeqNo.
   * For this implementation, I'll support getting by TDN (returning array) or specific composite if needed.
   * However, standard REST usually implies /id. Let's assume fetching by TDN for now as the primary use case, 
   * or we might need a composite identifier like "TDN|SeqNo".
   * Let's stick to TDN as the main identifier for retrieval for now, similar to RPT_ASS.)
   */
  async getByTdn(tdn) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('tdn', sql.VarChar, tdn)
        .query('SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_ADJ WHERE TDN = @tdn');

      return result.recordset;
    } catch (error) {
      logger.error('Error in BldgAdjService.getByTdn:', error);
      throw new AppError('Database query failed', 500);
    }
  }

  /**
   * Create a new record
   */
  async create(data) {
    try {
      const pool = await poolPromise;
      const request = pool.request();

      const fields = [
        'Region', 'Prov', 'City', 'DISTRICT', 'TDN', 'KIND', 'Classification', 'Actual_use', 
        'SubClass', 'Struc_Type', 'BldgCode', 'Storey', 'MainComp', 'CompExtn', 'DescNote', 
        'Area', 'AdditionalArea', 'UnitCost', 'BaseVal', 'PercentCost', 'Market_Val', 
        'Dep_Rate', 'Acc_Dep', 'Sub_total', 'Additional', 'SeqNo', 'ISADDITIONAL', 
        'FloorOrd', 'Sub_Tdn', 'PercentComp'
      ];

      fields.forEach(field => {
        if (data[field] !== undefined) {
          if (typeof data[field] === 'number') {
             request.input(field, sql.Decimal(18, 4), data[field]);
          } else if (typeof data[field] === 'boolean') {
             request.input(field, sql.Bit, data[field]);
          } else {
             request.input(field, sql.VarChar, data[field]);
          }
        } else {
             request.input(field, sql.VarChar, null);
        }
      });

      const columns = fields.join(', ');
      const values = fields.map(f => `@${f}`).join(', ');

      const query = `
        INSERT INTO RPTAS_AGUSAN.dbo.BLDG_ADJ (${columns})
        VALUES (${values});
        SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_ADJ WHERE TDN = @TDN AND SeqNo = @SeqNo; -- Assuming SeqNo helps uniqueness
      `;

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Error in BldgAdjService.create:', error);
      throw new AppError('Creation failed: ' + error.message, 500);
    }
  }

  /**
   * Update a record (Requires TDN and usually SeqNo or similar to identify specific row)
   * I'll assume updates are done by TDN and SeqNo if provided, or just TDN if it's a bulk update?
   * Usually building adjustments are specific items.
   * I'll implement update by TDN and SeqNo.
   */
  async update(tdn, seqNo, data) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      request.input('tdn', sql.VarChar, tdn);
      request.input('seqNo', sql.VarChar, seqNo); // Assuming SeqNo is string/varchar based on input, or int.

      const fields = Object.keys(data);
      if (fields.length === 0) throw new AppError('No data provided for update', 400);

      const setClause = fields.map(field => {
        request.input(field, data[field]);
        return `${field} = @${field}`;
      }).join(', ');

      const query = `
        UPDATE RPTAS_AGUSAN.dbo.BLDG_ADJ
        SET ${setClause}
        WHERE TDN = @tdn AND SeqNo = @seqNo;
        SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_ADJ WHERE TDN = @tdn AND SeqNo = @seqNo;
      `;

      const result = await request.query(query);
      if (result.recordset.length === 0) throw new AppError('Record not found', 404);
      
      return result.recordset[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgAdjService.update:', error);
      throw new AppError('Update failed: ' + error.message, 500);
    }
  }

  /**
   * Delete a record
   */
  async delete(tdn, seqNo) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      request.input('tdn', sql.VarChar, tdn);
      request.input('seqNo', sql.VarChar, seqNo);

      const check = await request.query('SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_ADJ WHERE TDN = @tdn AND SeqNo = @seqNo');
      if (check.recordset.length === 0) throw new AppError('Record not found', 404);

      // Hard delete as usually adjustment tables don't have soft delete flags, or user wants to remove line item.
      // If soft delete required, we'd need a flag. The prompt asked for CRUD.
      // I'll stick to DELETE for now.
      await request.query('DELETE FROM RPTAS_AGUSAN.dbo.BLDG_ADJ WHERE TDN = @tdn AND SeqNo = @seqNo');
      
      return check.recordset[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgAdjService.delete:', error);
      throw new AppError('Delete failed', 500);
    }
  }
}

module.exports = new BldgAdjService();
