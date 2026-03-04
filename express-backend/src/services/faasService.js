const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class FaasService {
  /**
   * Create or Update a FAAS record (Draft)
   * @param {Object} data - The FAAS data
   * @param {string} userEmail - The user email (for createdBy)
   */
  async saveDraft(data, userEmail) {
    try {
      // Validate basic integrity
      if (!data) throw new AppError('No data provided', 400);

      // Extract TDN for identification
      const tdn = data.tdn || data.TDN;

      let record;
      // If we have an existing Supabase ID, update it
      if (data.id && data.id.length > 10 && !data.id.includes('DUMMY')) { 
        record = await supabasePrisma.faasRecord.update({
          where: { id: data.id },
          data: {
            tdn: tdn || null,
            status: 'draft',
            data: data, // Store the full JSON (snapshot of MSSQL + edits)
            updatedAt: new Date()
          }
        });
      } else {
        // Create new record
        // Check if a record with this TDN already exists to prevent duplicates if TDN is stable
        let existing = null;
        if (tdn) {
             existing = await supabasePrisma.faasRecord.findUnique({ where: { tdn } });
        }

        if (existing) {
             record = await supabasePrisma.faasRecord.update({
                 where: { id: existing.id },
                 data: {
                     status: 'draft',
                     data: data,
                     updatedAt: new Date()
                 }
             });
        } else {
            record = await supabasePrisma.faasRecord.create({
              data: {
                tdn: tdn || null,
                status: 'draft',
                data: data,
                createdBy: userEmail
              }
            });
        }
      }

      // Log migration/sync event if this originated from MSSQL (TDN exists)
      if (tdn) {
          await supabasePrisma.migrationLog.create({
              data: {
                  sourceId: tdn,
                  targetId: record.id,
                  status: 'synced',
                  details: {
                      action: 'save_draft',
                      user: userEmail,
                      timestamp: new Date()
                  }
              }
          });
      }

      return record;
    } catch (error) {
      logger.error('Error in FaasService.saveDraft:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Submit a FAAS record for review
   * @param {string} id - The record ID (UUID)
   */
  async submitForReview(id) {
    try {
      const record = await supabasePrisma.faasRecord.update({
        where: { id },
        data: {
          status: 'for-review',
          updatedAt: new Date()
        }
      });
      return record;
    } catch (error) {
      logger.error('Error in FaasService.submitForReview:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Get a FAAS record by ID
   * @param {string} id 
   */
  async getRecord(id) {
    try {
      const record = await supabasePrisma.faasRecord.findUnique({
        where: { id }
      });
      return record;
    } catch (error) {
      logger.error('Error in FaasService.getRecord:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * List FAAS records
   * @param {Object} params - { status, page, limit }
   */
  async listRecords({ status, page = 1, limit = 100 }) {
    try {
      const where = {};
      if (status) where.status = status;

      const skip = (page - 1) * limit;
      
      const [records, total] = await Promise.all([
        supabasePrisma.faasRecord.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' }
        }),
        supabasePrisma.faasRecord.count({ where })
      ]);

      return {
        data: records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error in FaasService.listRecords:', error);
      throw new AppError(error.message, 500);
    }
  }
}

module.exports = new FaasService();