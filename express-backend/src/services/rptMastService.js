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
    m.SEC_NO, m.PARCEL_NO, m.IMP_NO, m.OWN_CD, m.OWNER_NO, m.ADM_CD, m.LOCATION, 
    m.TAX_BEG_YR, m.EFF_DATE, m.DEC_DATE, m.TRANS_CD, m.CER_TIT_NO,
    m.CAD_LOT_NO, m.ASS_LOT_NO, m.BLOCK_NO, m.LOTE_NO, m.STREET, m.NORTH, m.SOUTH, m.EAST, 
    m.WEST,m.USER_ID, m.DATE_ENC, m.USER_EDIT, m.DATE_EDIT, 
    m.IsLocked,
    m.ENTRY_DATE, m.Manual_TDN, m.PropClass, m.NOA_ISNULL, 
    m.MTDN, m.old_owner_no, m.old_admin_no,
    D.Owner_No as ADMIN_NO,
    D.Name AS ADMIN,
    B.CODE AS 'BRGY.CODE' ,
    B.DESCRIPTION as BARANGAY,
    o.Owner_No AS Owner_No, 
    o.Name AS Owner_Name, 
    o.Address AS Owner_Address, 
    o.Tel_no AS Owner_Tel_no,
    ms.TDN AS P_NEW_TDN,
    ms.CANCELS AS P_OLD_TDN,
    ms.Pin AS P_PIN,
    ms.Pmarket_val AS P_MARKET_VALUE,
    ms.Pass_value AS P_ASS_VALUE,
    ms.Pown_cd AS P_OWNER_CODE,
    ms.Powner_no AS P_OWNER_NO,
    ms.CANCARP AS CAN_ARP,
    ms.AREA AS P_AREA,
    ms.IF_DEFAULT AS P_AREA_M,
    ms.EFF_DATE AS P_EFF_DATE,
    p.Name AS P_OWNER,
    s.Appraiser,
    s.AppraiserPos,
    s.AppraisedDate,
    s.Assessor,
    s.AssessorPos,
    s.AssessorDate,
    s.Rec_Approval,
    s.Rec_ApprovalPos,
    s.Rec_AppDate,
    s.Approved,
    s.ApprovedPos,
    s.ApprovedDate,
    s.ProvAssessor,
    s.ProvAssessorPos,
    s.ProvAssessorDate,
    s.CityAssessor,
    s.CityAssessorPos,
    s.CityAssessorDate,
    s.Deputy,
    s.DeputyPos,
    s.DeputyDate,
    s.LANDMVAL,
    s.IMPMVAL,
    s.SIGN1,
    s.TIN1,
    s.DTSUBCRIBE,
    s.TAXCERT,
    s.DTTAXCERT,
    s.PLACETAXCERT,
    s.OFFICIALADMIN,
    s.OFFICIALTITLE,
    s.TIN2,
    s.SGD_APPRAISED,
    s.SGD_RECOMMEND,
    s.SGD_APPROVED,
    s.SGD_ASSESSED,
    s.SGD_PROV,
    s.SGD_CITY,
    s.SGD_DEPUTY,
    s.PREPAREDBY,
    s.TPD_APPRAISED,
    s.TPD_RECOMMEND,
    s.TPD_APPROVED,
    s.TPD_ASSESSED,
    s.TPD_PROV,
    s.TPD_CITY,
    s.TPD_DEPUTY,
    s.REPRESENTATIVE,
    s.SwornNo,
    s.dtSworn,
    s.PreparedDate,
    s.Reviewed,
    s.ReviewedPos,
    s.ReviewedDate,
    s.SGD_REVIEWED,
    s.TPD_REVIEWED



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
LEFT JOIN RPTAS_AGUSAN.dbo.MASTEXTN ms
    ON m.TDN = ms.TDN
LEFT JOIN RPTAS_AGUSAN.dbo.Rptowner p  
    ON ms.Powner_no = p.OWNER_NO
LEFT JOIN RPTAS_AGUSAN.dbo.SIGNATORY s
    ON m.TDN = s.TDN
 

WHERE 
    
    
    m.TDN IS NOT NULL
    AND TAX_BEG_YR > 2022
    AND m.OWNER_NO is not null
`;

      // Dynamic Filter Logic
      if (searchField && filterValue) {
        // Remove leading/trailing wildcards from input if they exist, to prevent double wildcards
        const cleanValue = filterValue.replace(/^%+|%+$/g, '');
        const sanitizedValue = cleanValue.replace(/'/g, "''"); 
        
        if (sanitizedValue) {
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
              break;
          }
        }
      }

      baseQuery += ` ORDER BY m.TDN ASC;`;

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
