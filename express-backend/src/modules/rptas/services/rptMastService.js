const { poolPromise } = require('../database/mssql');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

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
  async getAgusanMigrationData({ page = 1, limit = 20000, searchField, filterValue, municipalityCode, user } = {}) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Determine target municipality based on user role
      let targetMunicipality = null;
      if (user && user.role === 'admin') {
        // Admin can view all or filter by specific municipality
        // If admin provides a specific municipalityCode in query, use it.
        // If query param is 'ADN' or 'ALL', explicitly show all (targetMunicipality = null)
        // If not, but admin has a municipalityCode assigned in their profile, default to that.
        // If neither, they see all (targetMunicipality stays null).
        
        if (municipalityCode && municipalityCode !== 'ADN' && municipalityCode !== 'ALL') {
          targetMunicipality = municipalityCode;
        } else if (municipalityCode === 'ADN' || municipalityCode === 'ALL') {
           targetMunicipality = null; // Explicitly show all
        } else if (user.municipalityCode) {
           // Fix: If user's assigned municipality is ADN/ALL, treat as null (show all)
           if (user.municipalityCode === 'ADN' || user.municipalityCode === 'ALL') {
             targetMunicipality = null;
           } else {
             targetMunicipality = user.municipalityCode;
           }
        }
      } else if (user) {
        // Regular users are restricted to their assigned municipality
        // If assigned ADN/ALL, they can see all (though usually reserved for admins)
        if (user.municipalityCode === 'ADN' || user.municipalityCode === 'ALL') {
          targetMunicipality = null;
        } else {
          targetMunicipality = user.municipalityCode;
        }
        
        if (!targetMunicipality && user.municipalityCode !== 'ADN' && user.municipalityCode !== 'ALL') {
          logger.warn(`User ${user.email} has no municipalityCode assigned. Returning empty result.`);
          return {
            data: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              totalPages: 0
            }
          };
        }
      } else {
         // Fallback for safety
         throw new AppError('Unauthorized access', 401);
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
    s.TPD_REVIEWED,
    tree_data.trees_json,

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
    p.Name AS P_OWNER

FROM RPTAS_AGUSAN.dbo.RPTMAST m

OUTER APPLY (
    SELECT TOP 1 Owner_No, Name, Address, Tel_no 
    FROM RPTAS_AGUSAN.dbo.Rptowner 
    WHERE Owner_No = m.OWNER_NO
) o
OUTER APPLY (
    SELECT TOP 1 CODE, DESCRIPTION 
    FROM RPTAS_AGUSAN.dbo.BARANGAY 
    WHERE REGION = m.REGION 
    AND PROV = m.PROV 
    AND CITY = m.CITY 
    AND CODE = m.BCODE
) B
OUTER APPLY (
    SELECT TOP 1 Owner_No, Name 
    FROM RPTAS_AGUSAN.dbo.Rptowner 
    WHERE Owner_No = m.ADMIN_NO
) D
OUTER APPLY (
    SELECT TOP 1 * 
    FROM RPTAS_AGUSAN.dbo.SIGNATORY 
    WHERE TDN = m.TDN
) s
OUTER APPLY (
    SELECT TOP 1 * 
    FROM RPTAS_AGUSAN.dbo.MASTEXTN 
    WHERE TDN = m.TDN
) ms
OUTER APPLY (
    SELECT TOP 1 Name 
    FROM RPTAS_AGUSAN.dbo.Rptowner 
    WHERE Owner_No = ms.Powner_no
) p
-- Include Trees Data
OUTER APPLY (
    SELECT 
        (
            SELECT 
                t.TDN,
                t.Prod_Code,
                t.Area,
                t.Tot_FB,
                t.Non_FB,
                t.FB,
                t.Age,
                t.Unit_Price,
                t.Market_Value,
                t.NFB_UnitPrice
            FROM RPTAS_AGUSAN.dbo.RPT_TREE t
            WHERE t.TDN = m.TDN
            FOR JSON PATH
        ) AS trees_json
) tree_data
 

WHERE 
    
    
    m.TDN IS NOT NULL
  
    AND m.OWNER_NO is not null
`;

      let countQuery = `
SELECT COUNT(*) as total 
FROM RPTAS_AGUSAN.dbo.RPTMAST m
OUTER APPLY (
    SELECT TOP 1 Owner_No, Name, Address, Tel_no 
    FROM RPTAS_AGUSAN.dbo.Rptowner 
    WHERE Owner_No = m.OWNER_NO
) o
WHERE 
    m.TDN IS NOT NULL
    AND m.OWNER_NO is not null
`;

      // Apply Municipality Filter
      if (targetMunicipality) {
          // Use safe string interpolation or parameter if possible, but existing code uses template literals
          // Ideally use parameters, but sticking to existing pattern for consistency
          // Ensuring targetMunicipality is safe (it comes from DB or sanitized param)
          baseQuery += ` AND m.CITY = '${targetMunicipality.replace(/'/g, "''")}'`;
          countQuery += ` AND m.CITY = '${targetMunicipality.replace(/'/g, "''")}'`;
      }

      // Dynamic Filter Logic
      if (searchField && filterValue) {
        // Remove leading/trailing wildcards from input if they exist, to prevent double wildcards
        const cleanValue = filterValue.replace(/^%+|%+$/g, '');
        const sanitizedValue = cleanValue.replace(/'/g, "''"); 
        
        if (sanitizedValue) {
          switch (searchField) {
            case 'TDN':
              baseQuery += ` AND m.TDN LIKE '%${sanitizedValue}%'`;
              countQuery += ` AND m.TDN LIKE '%${sanitizedValue}%'`;
              break;
            case 'ARP':
              baseQuery += ` AND m.ARP LIKE '%${sanitizedValue}%'`;
              countQuery += ` AND m.ARP LIKE '%${sanitizedValue}%'`;
              break;
            case 'PIN':
              baseQuery += ` AND m.PIN LIKE '%${sanitizedValue}%'`;
              countQuery += ` AND m.PIN LIKE '%${sanitizedValue}%'`;
              break;
            case 'OWNER':
              baseQuery += ` AND o.Name LIKE '%${sanitizedValue}%'`;
              countQuery += ` AND o.Name LIKE '%${sanitizedValue}%'`;
              break;
            case 'TAX_BEG_YR':
              baseQuery += ` AND m.TAX_BEG_YR = '${sanitizedValue}'`;
              countQuery += ` AND m.TAX_BEG_YR = '${sanitizedValue}'`;
              break;
            default:
              break;
          }
        }
      }

      // First get total count
      logger.info('Executing RPTAS_AGUSAN migration count query...');
      const countResult = await pool.request().query(countQuery);
      const totalRecords = countResult.recordset[0].total;

      // Then get paginated data
      const startIndex = (page - 1) * limit;
      baseQuery += ` ORDER BY m.TDN ASC OFFSET ${startIndex} ROWS FETCH NEXT ${limit} ROWS ONLY;`;

      logger.info('Executing RPTAS_AGUSAN migration query via MSSQL driver...');

      const result = await pool.request().query(baseQuery);
      const records = result.recordset.map(record => {
          // Parse trees_json if it exists
          let trees = [];
          if (record.trees_json) {
              try {
                  trees = JSON.parse(record.trees_json);
              } catch (e) {
                  logger.warn(`Failed to parse trees_json for TDN ${record.TDN}`, e);
              }
          }
          // Remove the raw json string from the record to keep it clean
          delete record.trees_json;
          
          return {
              ...record,
              trees: trees
          };
      });

      logger.info(`Query executed successfully. Records found: ${records.length} (Total: ${totalRecords})`);

      return {
        data: records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limit)
        }
      };
    } catch (error) {
      logger.error('Error executing RPTAS_AGUSAN migration query:', error);
      throw new AppError('Database query failed: ' + error.message, 500);
    }
  }

  /**
   * Get MASTEXTN data by TDN
   * @param {string} tdn - Tax Declaration Number
   */
  async getMastExtn(tdn) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      const query = `
        SELECT TOP 1
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
          p.Name AS P_OWNER
        FROM RPTAS_AGUSAN.dbo.MASTEXTN ms
        OUTER APPLY (
            SELECT TOP 1 Name 
            FROM RPTAS_AGUSAN.dbo.Rptowner 
            WHERE OWNER_NO = ms.Powner_no
        ) p
        WHERE ms.TDN = @tdn
      `;

      const result = await pool.request()
        .input('tdn', tdn)
        .query(query);

      return result.recordset[0] || null;
    } catch (error) {
      logger.error('Error fetching MASTEXTN data:', error);
      throw new AppError('Failed to fetch MASTEXTN data: ' + error.message, 500);
    }
  }

  /**
   * Update or Insert Signatory record
   * @param {string} tdn - Tax Declaration Number
   * @param {Object} data - Signatory data
   */
  async updateSignatory(tdn, data) {
    try {
      const pool = await poolPromise;
      if (!pool) {
        throw new Error('Database connection failed');
      }

      // Prepare values handling empty strings and booleans
      const safeString = (val) => val ? `'${val.replace(/'/g, "''")}'` : 'NULL';
      const safeDate = (val) => val ? `'${val}'` : 'NULL';
      const safeBool = (val) => val ? 1 : 0;

      const query = `
        MERGE INTO RPTAS_AGUSAN.dbo.SIGNATORY AS target
        USING (SELECT '${tdn}' as TDN) AS source
        ON (target.TDN = source.TDN)
        WHEN MATCHED THEN
          UPDATE SET
            Appraiser = ${safeString(data.appraisedBy)},
            AppraiserPos = ${safeString(data.appraisedPosition)},
            AppraisedDate = ${safeDate(data.appraisedDate)},
            SGD_APPRAISED = ${safeBool(data.appraisedSGD)},
            TPD_APPRAISED = ${safeBool(data.appraisedTPD)},
            
            Assessor = ${safeString(data.assessedBy)},
            AssessorPos = ${safeString(data.assessedPosition)},
            AssessorDate = ${safeDate(data.assessedDate)},
            SGD_ASSESSED = ${safeBool(data.assessedSGD)},
            TPD_ASSESSED = ${safeBool(data.assessedTPD)},
            
            Rec_Approval = ${safeString(data.recommendingBy)},
            Rec_ApprovalPos = ${safeString(data.recommendingPosition)},
            Rec_AppDate = ${safeDate(data.recommendingDate)},
            SGD_RECOMMEND = ${safeBool(data.recommendingSGD)},
            TPD_RECOMMEND = ${safeBool(data.recommendingTPD)},
            
            Approved = ${safeString(data.approvedBy)},
            ApprovedPos = ${safeString(data.approvedPosition)},
            ApprovedDate = ${safeDate(data.approvedDate)},
            SGD_APPROVED = ${safeBool(data.approvedSGD)},
            TPD_APPROVED = ${safeBool(data.approvedTPD)},
            
            ProvAssessor = ${safeString(data.provincialAssessor)},
            ProvAssessorPos = ${safeString(data.provincialPosition)},
            ProvAssessorDate = ${safeDate(data.provincialDate)},
            SGD_PROV = ${safeBool(data.provincialSGD)},
            TPD_PROV = ${safeBool(data.provincialTPD)},
            
            CityAssessor = ${safeString(data.cityAssessor)},
            CityAssessorPos = ${safeString(data.cityPosition)},
            CityAssessorDate = ${safeDate(data.cityDate)},
            SGD_CITY = ${safeBool(data.citySGD)},
            TPD_CITY = ${safeBool(data.cityTPD)},
            
            Deputy = ${safeString(data.deputy)},
            DeputyPos = ${safeString(data.deputyPosition)},
            DeputyDate = ${safeDate(data.deputyDate)},
            SGD_DEPUTY = ${safeBool(data.deputySGD)},
            TPD_DEPUTY = ${safeBool(data.deputyTPD)},

            PREPAREDBY = ${safeString(data.entryBy)},
            PreparedDate = ${safeDate(data.entryDate)}

        WHEN NOT MATCHED THEN
          INSERT (
            TDN, 
            Appraiser, AppraiserPos, AppraisedDate, SGD_APPRAISED, TPD_APPRAISED,
            Assessor, AssessorPos, AssessorDate, SGD_ASSESSED, TPD_ASSESSED,
            Rec_Approval, Rec_ApprovalPos, Rec_AppDate, SGD_RECOMMEND, TPD_RECOMMEND,
            Approved, ApprovedPos, ApprovedDate, SGD_APPROVED, TPD_APPROVED,
            ProvAssessor, ProvAssessorPos, ProvAssessorDate, SGD_PROV, TPD_PROV,
            CityAssessor, CityAssessorPos, CityAssessorDate, SGD_CITY, TPD_CITY,
            Deputy, DeputyPos, DeputyDate, SGD_DEPUTY, TPD_DEPUTY,
            PREPAREDBY, PreparedDate
          )
          VALUES (
            '${tdn}',
            ${safeString(data.appraisedBy)}, ${safeString(data.appraisedPosition)}, ${safeDate(data.appraisedDate)}, ${safeBool(data.appraisedSGD)}, ${safeBool(data.appraisedTPD)},
            ${safeString(data.assessedBy)}, ${safeString(data.assessedPosition)}, ${safeDate(data.assessedDate)}, ${safeBool(data.assessedSGD)}, ${safeBool(data.assessedTPD)},
            ${safeString(data.recommendingBy)}, ${safeString(data.recommendingPosition)}, ${safeDate(data.recommendingDate)}, ${safeBool(data.recommendingSGD)}, ${safeBool(data.recommendingTPD)},
            ${safeString(data.approvedBy)}, ${safeString(data.approvedPosition)}, ${safeDate(data.approvedDate)}, ${safeBool(data.approvedSGD)}, ${safeBool(data.approvedTPD)},
            ${safeString(data.provincialAssessor)}, ${safeString(data.provincialPosition)}, ${safeDate(data.provincialDate)}, ${safeBool(data.provincialSGD)}, ${safeBool(data.provincialTPD)},
            ${safeString(data.cityAssessor)}, ${safeString(data.cityPosition)}, ${safeDate(data.cityDate)}, ${safeBool(data.citySGD)}, ${safeBool(data.cityTPD)},
            ${safeString(data.deputy)}, ${safeString(data.deputyPosition)}, ${safeDate(data.deputyDate)}, ${safeBool(data.deputySGD)}, ${safeBool(data.deputyTPD)},
            ${safeString(data.entryBy)}, ${safeDate(data.entryDate)}
          );
      `;

      await pool.request().query(query);
      return { success: true, message: 'Signatories updated successfully' };
    } catch (error) {
      logger.error('Error updating Signatories:', error);
      throw new AppError('Failed to update signatories: ' + error.message, 500);
    }
  }

  /**
   * Check for duplicate TDN or PIN in RPTMAST
   * @param {string} tdn 
   * @param {string} pin 
   */
  async checkDuplicate(tdn, pin) {
    try {
      const pool = await poolPromise;
      if (!pool) throw new Error('Database connection failed');

      // Check TDN
      let tdnResult = null;
      if (tdn) {
        tdnResult = await pool.request()
          .input('tdn', tdn)
          .query('SELECT TOP 1 TDN, PIN FROM RPTAS_AGUSAN.dbo.RPTMAST WHERE TDN = @tdn');
      }

      // Check PIN
      let pinResult = null;
      if (pin) {
        pinResult = await pool.request()
          .input('pin', pin)
          .query('SELECT TOP 1 TDN, PIN FROM RPTAS_AGUSAN.dbo.RPTMAST WHERE PIN = @pin');
      }

      return {
        tdnExists: tdnResult && tdnResult.recordset.length > 0,
        tdnRecord: tdnResult && tdnResult.recordset[0],
        pinExists: pinResult && pinResult.recordset.length > 0,
        pinRecord: pinResult && pinResult.recordset[0]
      };

    } catch (error) {
      logger.error('Error checking duplicates:', error);
      // Don't throw, just return nulls or assume no duplicate to avoid blocking if DB is down? 
      // No, validation is critical. Throw.
      throw new AppError('Validation check failed: ' + error.message, 500);
    }
  }

  /**
   * Get distinct Tax Beginning Years from RPTMAST
   */
  async getDistinctTaxBegYears() {
    try {
      const pool = await poolPromise;
      if (!pool) throw new Error('Database connection failed');

      const result = await pool.request()
        .query(`
          SELECT DISTINCT TAX_BEG_YR 
          FROM RPTAS_AGUSAN.dbo.RPTMAST 
          WHERE TAX_BEG_YR IS NOT NULL AND LTRIM(RTRIM(TAX_BEG_YR)) != ''
          ORDER BY TAX_BEG_YR DESC
        `);

      return result.recordset.map(row => row.TAX_BEG_YR.trim());
    } catch (error) {
      logger.error('Error fetching distinct tax beginning years from RPTMAST:', error);
      throw new AppError('Failed to fetch distinct tax beginning years', 500);
    }
  }
}

module.exports = new RptMastService();
