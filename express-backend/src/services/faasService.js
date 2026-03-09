const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const rptMastService = require('./rptMastService');

class FaasService {
  /**
   * Validate TDN and PIN uniqueness
   * @param {Object} data 
   * @param {string} currentId 
   */
  async validateTransaction(data, currentId = null) {
    const tdn = data.tdn || data.TDN;
    const pin = data.pin || data.PIN;
    const pOldTdn = data.pOldTdn; // Parent TDN if transaction

    const checks = [];

    // 1. Check Supabase (Drafts)
    if (tdn) {
      checks.push(
        supabasePrisma.faasRecord.findFirst({
          where: {
            tdn: tdn,
            id: { not: currentId || '00000000-0000-0000-0000-000000000000' },
            status: { not: 'cancelled' }
          }
        }).then(existing => {
            if (existing) {
                throw new AppError(`TDN ${tdn} is already pending in another draft.`, 409);
            }
        })
      );
    }

    // 2. Check MSSQL (Active Records)
    if (tdn || pin) {
        checks.push(
            rptMastService.checkDuplicate(tdn, pin).then(mssqlCheck => {
                if (mssqlCheck.tdnExists) {
                   if (data.TRANS_CD) {
                       throw new AppError(`TDN ${tdn} is currently active. Please assign a new TDN for this transaction.`, 409);
                   }
                }
    
                if (mssqlCheck.pinExists) {
                  const isParent = pOldTdn && mssqlCheck.pinRecord.TDN === pOldTdn;
                  if (!isParent) {
                    throw new AppError(`PIN ${pin} already exists (Used by TDN: ${mssqlCheck.pinRecord.TDN})`, 409);
                  }
                }
            })
        );
    }

    // Run checks in parallel
    await Promise.all(checks);
  }

  /**
   * Create or Update a FAAS record (Draft)
   * @param {Object} data - The FAAS data
   * @param {string} userEmail - The user email (for createdBy)
   * @param {string} id - The ID for update (optional)
   * @param {string} userId - The user ID (optional)
   */
  async saveDraft(data, userEmail, id = null, userId = null) {
    try {
      // Validate basic integrity
      if (!data) throw new AppError('No data provided', 400);

      // Extract TDN for identification
      const tdn = data.tdn || data.TDN;
      
      // Resolve existing record to get the correct UUID for validation exception
      let existingRecord = null;
      
      if (id) {
        existingRecord = await supabasePrisma.faasRecord.findUnique({ where: { id } });
      } else if (data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)) {
        existingRecord = await supabasePrisma.faasRecord.findUnique({ where: { id: data.id } });
      }
      
      if (!existingRecord && tdn) {
        existingRecord = await supabasePrisma.faasRecord.findUnique({ where: { tdn } });
      }

      // Determine the ID to exclude from validation
      const currentId = existingRecord ? existingRecord.id : (id || data.id);
      
      // Perform Validation
      await this.validateTransaction(data, currentId);

      let record;
      let action;

      if (existingRecord) {
        // Update existing record
        action = 'UPDATE_DRAFT';
        record = await supabasePrisma.faasRecord.update({
          where: { id: existingRecord.id },
          data: {
            tdn: tdn || null,
            status: 'draft',
            data: data, // Store the full JSON (snapshot of MSSQL + edits)
            updatedAt: new Date()
          }
        });
      } else {
        // Create new record
        action = 'CREATE_DRAFT';
        // If the provided ID is a valid UUID, use it; otherwise let Prisma generate one
        const isValidUuid = data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
        const idToUse = isValidUuid ? data.id : undefined;

        record = await supabasePrisma.faasRecord.create({
          data: {
            ...(idToUse && { id: idToUse }), // Only add id property if it's valid
            tdn: tdn || null,
            status: 'draft',
            data: data,
            createdBy: userEmail
          }
        });
      }

      // Audit Log
      await this.logAudit(action, record.id, { tdn }, userEmail, userId);

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
      // Preserve existing status code if available (e.g. 409 from validation), otherwise 500
      const statusCode = error.statusCode || 500;
      throw new AppError(error.message, statusCode);
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
      const statusCode = error.statusCode || 500;
      throw new AppError(error.message, statusCode);
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
   * Cancel a transaction (Delete the draft)
   * @param {string} id
   * @param {string} userEmail
   * @param {string} userId
   */
  async cancelTransaction(id, userEmail, userId) {
    try {
      // First get the record to log details if needed
      const record = await this.getRecord(id);
      if (!record) throw new AppError('Record not found', 404);

      // Delete the record
      await supabasePrisma.faasRecord.delete({
        where: { id }
      });

      // Audit Log
      await this.logAudit('CANCEL_TRANSACTION', id, { tdn: record.tdn, status: record.status }, userEmail, userId);

      return { success: true };
    } catch (error) {
      logger.error('Error in FaasService.cancelTransaction:', error);
      throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Delete a FAAS record
   * @param {string} id
   * @param {string} userEmail
   * @param {string} userId
   */
  async deleteRecord(id, userEmail = null, userId = null) {
    try {
      const record = await supabasePrisma.faasRecord.delete({
        where: { id }
      });
      
      // Audit Log
      await this.logAudit('DELETE_RECORD', id, { tdn: record.tdn }, userEmail, userId);

      return record;
    } catch (error) {
      logger.error('Error in FaasService.deleteRecord:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Helper to create audit log
   */
  async logAudit(action, recordId, details, userEmail, userId) {
    try {
        await supabasePrisma.auditLog.create({
            data: {
                tableName: 'faas_records',
                recordId: recordId,
                action: action,
                userEmail: userEmail,
                userId: userId,
                details: details,
                timestamp: new Date()
            }
        });
    } catch (error) {
        // Don't fail the operation if logging fails, just log the error
        logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * List FAAS records
   * @param {Object} params - { status, page, limit, searchField, filterValue }
   */
  async listRecords({ status, page = 1, limit = 100, searchField, filterValue }) {
    try {
      const where = {};
      if (status) where.status = status;

      // Add search logic
      if (searchField && filterValue && filterValue !== '%') {
        const cleanValue = filterValue.replace(/^%+|%+$/g, ''); // Remove wildcards for contains
        
        if (cleanValue) {
            switch (searchField) {
                case 'TDN':
                    // TDN is a top-level column
                    where.tdn = { contains: cleanValue, mode: 'insensitive' };
                    break;
                case 'OWNER':
                    // Owner is inside the JSON data -> owner (or owner_name depending on frontend save)
                    // We need to check path: data->>'owner'
                    where.data = {
                        path: ['owner'],
                        string_contains: cleanValue
                    };
                    break;
                case 'PIN':
                    where.data = {
                        path: ['pin'],
                        string_contains: cleanValue
                    };
                    break;
                case 'ARP':
                    where.data = {
                        path: ['arp'],
                        string_contains: cleanValue
                    };
                    break;
                default:
                    // Try to search in data with the field name
                    // Note: This relies on Prisma's Json filtering capabilities which vary by DB.
                    // For Postgres, path/string_contains is supported in newer Prisma versions or raw query.
                    // Prisma's native JSON filtering:
                    // where: { data: { path: ['owner'], string_contains: 'John' } }
                    break;
            }
        }
      }

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);
      
      const [records, total] = await Promise.all([
        supabasePrisma.faasRecord.findMany({
          where,
          skip,
          take,
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