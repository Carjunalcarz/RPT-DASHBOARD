const { poolPromise } = require('../database/mssql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const sql = require('mssql');

class BldgStrucService {
  /**
   * Get all BLDG_STRUC records with filtering, sorting, and pagination
   */
  async getAll({ page = 1, limit = 20, sortBy = 'TDN', sortOrder = 'ASC', filters = {} }) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      const request2 = pool.request();

      // Base query
      let query = `
        SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_STRUC
        WHERE 1=1
      `;

      // Dynamic Filtering
      const filterableFields = [
        'Region', 'Prov', 'City', 'DISTRICT', 'TDN', 'KIND', 'Classification', 'Actual_use', 
        'SubClass', 'Struc_type', 'BldgCode', 'Storey', 'TAXABILITY', 'BU', 'Dep_Code', 
        'FloorOrd', 'Sub_Tdn', 'IsImprovement', 'Struc_Desc', 'Struc_Part', 'BUCC_CODE'
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
      query += ` ORDER BY ${sortBy} ${sortOrder} OFFSET ${(page - 1) * limit} ROWS FETCH NEXT ${limit} ROWS ONLY`;

      logger.info(`Executing BLDG_STRUC getAll query`);
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
      logger.error('Error in BldgStrucService.getAll:', error);
      throw new AppError('Database query failed', 500);
    }
  }

  /**
   * Get records by TDN
   */
  async getByTdn(tdn) {
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('tdn', sql.VarChar, tdn)
        .query('SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_STRUC WHERE TDN = @tdn');

      return result.recordset;
    } catch (error) {
      logger.error('Error in BldgStrucService.getByTdn:', error);
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
        'Region', 'Prov', 'City', 'DISTRICT', 'TDN', 'KIND', 'Classification', 'Actual_use', 'SubClass', 'Struc_type', 
        'BldgCode', 'Storey', 'TAXABILITY', 'BU', 'D_construct', 'D_occupied', 'D_complete', 'Maintenance', 'Age', 
        'Dep_Code', 'Dep_Rate', 'Floor_area', 'UNIT_VALUE', 'OLD_MVAL', 'Market_Val', 'ASS_LEVEL', 'ASS_VALUE', 
        'Foundation', 'Posts', 'Beams', 'Truss_Framing', 'Roof', 'Ext_Walls', 'Flooring', 'Doors', 'Ceiling', 'Windows', 
        'Stairs', 'Partition', 'Wall_Finish', 'Electrical', 'Toilet_Bath', 'Plumbing', 'Fixtures', 'StoreyDesc', 
        'Bldg_Permit', 'Total_Area', 'FloorOrd', 'Others', 'P_CONSTRUCT', 'FloorJoists', 'FloorDesc', 'FrameFlooring', 
        'FinFlooring', 'FrameExt_Walls', 'FinExt_Walls', 'FrameRoof', 'FinRoof', 'FramePartition', 'FinPartition', 
        'FrameCeiling', 'FinCeiling', 'Sub_Tdn', 'C_occupied', 'C_complete', 'IsImprovement', 'Struc_Desc', 'Struc_Part', 
        'BUCC_CODE', 'BUCC_Rate', 'AdjustedUnitValue', 'FirstFloor', 'SecondFloor', 'ThirdFloor'
      ];

      fields.forEach(field => {
        if (data[field] !== undefined) {
          if (typeof data[field] === 'number') {
             request.input(field, sql.Decimal(18, 4), data[field]);
          } else if (typeof data[field] === 'boolean') {
             request.input(field, sql.Bit, data[field]);
          } else if (field.startsWith('D_') || field.startsWith('C_') || field === 'P_CONSTRUCT') {
             // Date handling if needed, usually string YYYY-MM-DD or datetime
             // If string ISO, sql.Date or sql.DateTime works. If empty string, null.
             if (data[field]) request.input(field, sql.DateTime, new Date(data[field]));
             else request.input(field, sql.DateTime, null);
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
        INSERT INTO RPTAS_AGUSAN.dbo.BLDG_STRUC (${columns})
        VALUES (${values});
        SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_STRUC WHERE TDN = @TDN; -- Assuming TDN + FloorOrd/Struc_Part unique logic needed
      `;

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      logger.error('Error in BldgStrucService.create:', error);
      throw new AppError('Creation failed: ' + error.message, 500);
    }
  }

  /**
   * Update a record (Using TDN and maybe FloorOrd/Sub_Tdn for uniqueness)
   * Assuming TDN is sufficient for broad update or we need composite key.
   * Given the fields, `FloorOrd` or `Sub_Tdn` might be part of key.
   * I'll support TDN + FloorOrd for specific update.
   */
  async update(tdn, floorOrd, data) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      request.input('tdn', sql.VarChar, tdn);
      request.input('floorOrd', sql.Int, floorOrd);

      const fields = Object.keys(data);
      if (fields.length === 0) throw new AppError('No data provided for update', 400);

      const setClause = fields.map(field => {
        request.input(field, data[field]);
        return `${field} = @${field}`;
      }).join(', ');

      const query = `
        UPDATE RPTAS_AGUSAN.dbo.BLDG_STRUC
        SET ${setClause}
        WHERE TDN = @tdn AND FloorOrd = @floorOrd;
        SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_STRUC WHERE TDN = @tdn AND FloorOrd = @floorOrd;
      `;

      const result = await request.query(query);
      if (result.recordset.length === 0) throw new AppError('Record not found', 404);
      
      return result.recordset[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgStrucService.update:', error);
      throw new AppError('Update failed: ' + error.message, 500);
    }
  }

  /**
   * Delete a record
   */
  async delete(tdn, floorOrd) {
    try {
      const pool = await poolPromise;
      const request = pool.request();
      request.input('tdn', sql.VarChar, tdn);
      request.input('floorOrd', sql.Int, floorOrd);

      const check = await request.query('SELECT * FROM RPTAS_AGUSAN.dbo.BLDG_STRUC WHERE TDN = @tdn AND FloorOrd = @floorOrd');
      if (check.recordset.length === 0) throw new AppError('Record not found', 404);

      await request.query('DELETE FROM RPTAS_AGUSAN.dbo.BLDG_STRUC WHERE TDN = @tdn AND FloorOrd = @floorOrd');
      
      return check.recordset[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgStrucService.delete:', error);
      throw new AppError('Delete failed', 500);
    }
  }
}

module.exports = new BldgStrucService();
