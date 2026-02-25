const { poolPromise } = require('../database/mssql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Service to handle RPTMAST data operations
 */
class RptMastService {
  /**
   * Fetch eligible records for migration from RPTAS_AGUSAN
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Number of records per page (default: 20000)
   * @param {string} params.searchField - Field to search by (TDN, ARP, PIN, OWNER)
   * @param {string} params.filterValue - Value to search for
   * @returns {Promise<Object>} Object containing data and pagination info
   */
  async getAgusanMigrationData({ page = 1, limit = 20000, searchField, filterValue } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Base query
      let baseQuery = `
      SELECT 
    m.REGION, m.PROV, m.CITY, m.DIST_NO, m.TDN, m.BCODE, m.ARP, m.PIN,
    m.SEC_NO, m.PARCEL_NO, m.IMP_NO, m.OWN_CD, m.OWNER_NO, m.ADM_CD, m.ADMIN_NO, m.LOCATION, 
    m.TAX_BEG_YR, m.EFF_DATE, m.DEC_DATE, m.TRANS_CD, m.CER_TIT_NO,
    m.CAD_LOT_NO, m.ASS_LOT_NO, m.BLOCK_NO, m.LOTE_NO, m.STREET, m.NORTH, m.SOUTH, m.EAST, 
    m.WEST,m.USER_ID, m.DATE_ENC, m.USER_EDIT, m.DATE_EDIT, 
    m.IsLocked,
    m.ENTRY_DATE, m.Manual_TDN, m.PropClass, m.NOA_ISNULL, 
    m.MTDN, m.old_owner_no, m.old_admin_no,
    D.Owner_No as ADMIN_NO,
    D.Name as ADMIN,
    B.CODE as 'BRGY.CODE' ,
    B.DESCRIPTION as BARANGAY,
    o.Owner_No AS Owner_No, 
    o.Name AS Owner_Name, 
    o.Address AS Owner_Address, 
    o.Tel_no AS Owner_Tel_no

FROM RPTAS_AGUSAN.dbo.RPTMAST m

INNER JOIN RPTAS_AGUSAN.dbo.Rptowner o 
    ON m.OWNER_NO = o.Owner_No
INNER JOIN RPTAS_AGUSAN.dbo.BARANGAY B 
    ON m.REGION = B.REGION 
    AND m.PROV = B.PROV 
    AND m.CITY = B.CITY 
    AND m.BCODE = B.CODE
LEFT JOIN RPTAS_AGUSAN.dbo.Rptowner D   

    ON m.ADMIN_NO = D.OWNER_NO
 

WHERE 
    
    
    m.TDN IS NOT NULL
    AND TAX_BEG_YR > 2022
    AND m.OWNER_NO is not null
`;

      // Dynamic Filter Logic
      if (searchField && filterValue && filterValue !== '%') {
        const sanitizedValue = filterValue.replace(/'/g, "''"); // Basic SQL injection protection for raw query
        
        switch (searchField) {
          case 'TDN':
            baseQuery += ` AND m.TDN LIKE '%${sanitizedValue}%'`;
            break;
          case 'ARP':
            baseQuery += ` AND m.ARP LIKE '%${sanitizedValue}%'`;
            break;
          case 'PIN':
            baseQuery += ` AND m.PIN LIKE '%${sanitizedValue}%'`;
            break;
          case 'OWNER':
            baseQuery += ` AND o.Name LIKE '%${sanitizedValue}%'`;
            break;
          default:
            // If invalid search field, ignore or log warning
            break;
        }
      }

      baseQuery += ` ORDER BY m.CITY ASC;`;

      logger.info('Executing RPTAS_AGUSAN migration query via MSSQL driver...');

      logger.info('Executing RPTAS_AGUSAN migration query via MSSQL driver...');

      const result = await pool.request().query(baseQuery);
      const records = result.recordset;

      logger.info(`Query executed successfully. Records found: ${records.length}`);

      // Calculate pagination
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
      logger.error('Error executing RPTAS_AGUSAN migration query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }
}

module.exports = new RptMastService();
