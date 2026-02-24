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
   * @returns {Promise<Object>} Object containing data and pagination info
   */
  async getAgusanMigrationData({ page = 1, limit = 20000 } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Execute raw SQL query using node-mssql directly
      // This bypasses Prisma's NAPI bridge limitation for large result sets
      const query = `
        SELECT 
    m.REGION, m.PROV, m.CITY, m.DIST_NO, m.TDN, m.BCODE, m.KIND, m.ARP, m.PIN, m.BCODE_EXT, 
    m.SEC_NO, m.PARCEL_NO, m.IMP_NO, m.OWN_CD, m.OWNER_NO, m.ADM_CD, m.ADMIN_NO, m.LOCATION, 
    m.STREET_CD, m.TAX_BEG_YR, m.EFF_DATE, m.DEC_DATE, m.TRANS_CD, m.CER_TIT_NO, m.TCT_DATE, 
    m.CAD_LOT_NO, m.ASS_LOT_NO, m.BLOCK_NO, m.LOTE_NO, m.STREET, m.NORTH, m.SOUTH, m.EAST, 
    m.WEST, m.EXEMPT_CD, m.COMPANY, m.USER_ID, m.DATE_ENC, m.DATE_MOVE, m.USER_EDIT, m.DATE_EDIT, 
    m.REM, m.CCN, m.Adj_Factor, m.CLOA_NO, m.CLOA_DATE, m.IsLocked, m.LockedUser, m.LockedDate, 
    m.USER_IDCUR, m.NOA_NO, m.ENTRY_DATE, m.Manual_TDN, m.Village, m.PropClass, m.NOA_ISNULL, 
    m.PROP_TAG, m.BLDGNAME, m.CANC_CD, m.ENTRY_USER, m.ADJENTRY_DATE, m.NoaReceiver, m.NoaDateReceive, 
    m.IsLockedSign, m.LockedSignUser, m.LockedSignDate, m.MTDN, m.BLDGUNIT, m.EFF_CANC, m.FAAS_NO, 
    m.NCA_no, m.NEW_BCODE, m.NEW_SECNO, m.NEW_PARCELNO, m.NEW_PIN, m.NEW_DISTNO, m.NEW_IMPNO, 
    m.ASSREPORTNO, m.ANNO_AMOUNT, m.ANNO_FILENO, m.ANNO_ORNO, m.ANNO_DATE, m.ANNO_SIGNATORY, 
    m.ANNO_CANCELLED, m.ANNO_CANAMOUNT, m.ANNO_CANFILENO, m.ANNO_CANORNO, m.ANNO_CANDATE, 
    m.ANNO_CANSIGNATORY, m.CASENO, m.BONDPERSON, m.NEW_NOA_NO, m.PROP_TAG_CANCELLED, m.CANCASENO, 
    m.CANCBONDPERSON, m.X, m.dateofmigrated, m.IdentityFrmGeo, m.InActive, m.isInsert, m.oldpin, 
    m.OldTDN, m.t_CCT, m.TaxDecId, m.TDN_OLD, m.TRANS_CD_OLD, m.OLD_NOA_NO, m.OLD_DATE_RECEIVE, 
    m.NOTLANDOWNER, m.MOVE_REMARKS, m.ENTRY_POS, m.MOVE_USER, m.FAAS_CN, m.old_owner_no, m.old_admin_no,
    B.CODE as 'BRGY.CODE' ,
    B.DESCRIPTION as BARANGAY,
    o.Owner_No AS Owner_Owner_No, 
    o.Name AS Owner_Name, 
    o.Address AS Owner_Address, 
    o.Tel_no AS Owner_Tel_no, 
    o.User_id AS Owner_User_id, 
    o.Eff_Year AS Owner_Eff_Year, 
    o.Full_Name AS Owner_Full_Name, 
    o.TIN AS Owner_TIN

FROM RPTAS_AGUSAN.dbo.RPTMAST m

INNER JOIN RPTAS_AGUSAN.dbo.Rptowner o 
    ON m.OWNER_NO = o.Owner_No

LEFT JOIN RPTAS_AGUSAN.dbo.BARANGAY B 
    ON m.CITY = B.CITY 
    AND m.BCODE = B.CODE
LEFT JOIN RPTAS_AGUSAN.dbo.ADMIN_NO D   
    ON m.OWNER_NO = D.OWNER_NO
    AND m.ADMIN_NO = D.ADMIN_NO

WHERE 
    m.OWNER_NO IS NOT NULL
    AND m.CITY = '01'

ORDER BY 
    m.TDN ASC;
      `;

      logger.info('Executing RPTAS_AGUSAN migration query via MSSQL driver...');

      logger.info('Executing RPTAS_AGUSAN migration query via MSSQL driver...');

      const result = await pool.request().query(query);
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
