const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');
const rptMastService = require('./rptMastService');

const rptAssService = require('./rptAssService');
const { DB_SCHEMA } = require('../config/database');


class FaasService {
  /**
   * Validate TDN and PIN uniqueness
   * @param {Object} data 
   * @param {string} currentId 
   * @param {Object} existingRecord - Optional existing record to check for changes
   */
  async validateTransaction(data, currentId = null, existingRecord = null) {
    const tdn = data.tdn || data.TDN;
    const pin = data.pin || data.PIN;
    const pOldTdn = data.pOldTdn; // Parent TDN if transaction
    // Assuming pPin is passed from frontend as pPin or P_PIN
    const pPin = data.pPin || data.P_PIN; 

    // Rule 1: PIN Immutability
    // If pPin exists (meaning this is a revision/transaction from an existing property),
    // the new PIN must match the old PIN.
    if (pPin && pin && pin !== pPin) {
        throw new AppError("PIN is immutable and cannot be changed once assigned.", 400);
    }

    // Optimization: If updating an existing draft and critical fields (TDN/PIN) haven't changed, skip MSSQL check
    // This significantly speeds up auto-save
    let skipMssqlCheck = false;
    if (existingRecord) {
        const existingData = existingRecord.data || {};
        const existingTdn = existingRecord.tdn || existingData.TDN;
        const existingPin = existingData.PIN;
        
        // If TDN and PIN are identical to what's already saved, we assume it's still valid
        // (or at least we don't need to block saving a draft for a re-check)
        if (existingTdn === tdn && existingPin === pin) {
            skipMssqlCheck = true;
        }
    }

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
      // Only run MSSQL check if TDN or PIN is present and we're NOT updating an existing draft with the SAME TDN/PIN.
      if ((tdn || pin) && !skipMssqlCheck) {
          checks.push(
              rptMastService.checkDuplicate(tdn, pin).then(mssqlCheck => {
                  if (mssqlCheck.tdnExists) {
                     // Check if it's a valid "No Change" operation (New TDN === Old TDN)
                     // If existingRecord is null (new transaction) but data.pOldTdn matches tdn, 
                     // it implies the transaction intends to keep the same TDN.
                     
                     if (pOldTdn && mssqlCheck.tdnRecord.TDN === pOldTdn && tdn === pOldTdn) {
                         // This is a "Same TDN" transaction. Allow it.
                     } else {
                         // Rule 3: TDN Update Validation
                          // If submitted TDN exists...
                          
                          // Check if it belongs to another PIN
                          if (mssqlCheck.tdnRecord.PIN !== pin) {
                             // --- MODIFICATION: Allow legacy conflict during migration/encoding ---
                             // throw new AppError("TDN already exists and is assigned to another property.", 409);
                             logger.warn(`Legacy Conflict Warning: TDN ${tdn} exists in MSSQL but allowing save to Supabase.`);
                          } else {
                              // If it belongs to the SAME PIN, it implies we are either:
                              // 1. Updating the Active Record directly (if not a new transaction)
                              // 2. Or creating a Revision where we haven't changed the TDN yet (so it matches parent).
                              // This case is covered by the `if (pOldTdn && ... tdn === pOldTdn)` check above.
                              // But what if tdn !== pOldTdn, but tdn exists and has same PIN?
                              // This implies we are trying to reuse an OLD TDN of the same property?
                              // Or there is a duplicate TDN in the system for the same PIN.
                              // The rule says: "If the submitted TDN matches the current (old) TDN, the update is valid."
                              // "If ... does not match ... check if ... already belongs to another PIN."
                              
                              // So if it belongs to the SAME PIN, it is NOT rejected by that rule.
                              // Thus, implicitly allowed or requires further check.
                              // For now, we allow it if PIN matches.
                          }
                     }
                  }
      
                  if (mssqlCheck.pinExists) {
                    // Rule 3 (part 2): TDN Update Validation
                    // If we are changing TDN (tdn != pOldTdn), and the NEW TDN exists (handled above),
                    // we also need to ensure the PIN we are using is valid.
                    
                    // If pinExists, it means the PIN is already in use by SOME record.
                    // If that record is NOT the parent record, it's a conflict?
                    // Actually, for a Revision, we EXPECT the PIN to exist (it's the same property).
                    // So pinExists is GOOD if it matches pOldTdn's record.
                    
                    const isParent = pOldTdn && mssqlCheck.pinRecord.TDN === pOldTdn;
                    
                    // If the PIN exists but belongs to a DIFFERENT property (different TDN chain not linked to parent),
                    // then we might have an issue. But PIN is supposed to be unique per property.
                    // If we are reusing the PIN, it MUST be the same property.
                    
                    // If mssqlCheck.pinRecord.TDN !== pOldTdn, it means the PIN is currently assigned to another TDN.
                    // If we are doing a revision, we are essentially "taking over" this PIN for the new TDN.
                    // This is valid.
                    
                    // The error "TDN already exists and is assigned to another property" is handled in the tdnExists block.
                    // Here we check if PIN is being hijacked? No, Rule 1 handles PIN immutability.
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
      
      // Perform Validation (Passing existingRecord to optimize checks)
      await this.validateTransaction(data, currentId, existingRecord);

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

      // Audit Log (Non-blocking)
      this.logAudit(action, record.id, { tdn }, userEmail, userId).catch(err => {
          logger.warn(`Background audit log failed for ${action}:`, err.message);
      });

      // Log migration/sync event if this originated from MSSQL (TDN exists) (Non-blocking)
      if (tdn) {
          supabasePrisma.migrationLog.create({
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
          }).catch(err => {
              logger.warn(`Background migration log failed for ${tdn}:`, err.message);
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
          status: 'pending-municipal', // Default to first tier
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
   * Update FAAS record status
   * @param {string} id 
   * @param {string} status 
   * @param {string} remarks 
   * @param {string} userEmail 
   * @param {string} userId 
   */
  async updateStatus(id, status, remarks, userEmail, userId, approverName, approverPosition) {
    try {
        // 1. Get current record
        const currentRecord = await this.getRecord(id);
        if (!currentRecord) throw new AppError('Record not found', 404);

        const currentStatus = currentRecord.status;

        // 2. Validate Sequential Workflow
        if (status === 'pending-provincial') {
            // Can only move to provincial if currently pending municipal (approval action)
            // Or if it was rejected-provincial and being resubmitted (edge case, but let's stick to happy path)
            if (currentStatus !== 'pending-municipal' && currentStatus !== 'for-review') {
                 throw new AppError('Cannot move to Provincial Approval. Municipal Approval required first.', 400);
            }
        }

        if (status === 'approved') {
            // Can only move to final approved if currently pending provincial
            if (currentStatus !== 'pending-provincial') {
                 throw new AppError('Cannot approve. Provincial Approval required.', 400);
            }
        }

        // 3. Prepare update data
        const updateData = {
            status: status,
            updatedAt: new Date()
        };

        const currentData = currentRecord.data || {};
        let auditDetails = { status, remarks };
        const actorEmail = userEmail;
        const signatoryName = approverName || userEmail;
        const signatoryPosition = approverPosition || null;
        const nowIso = new Date().toISOString();

        // 4. Update Audit/Signatory Info in JSON Data
        if (status === 'pending-provincial') {
            // This is the "Municipal Approval" action
            updateData.data = {
                ...currentData,
                REM: remarks || currentData.REM,
                municipal_approver: actorEmail,
                municipal_approval_date: nowIso,
                Rec_Approval: signatoryName, // Legacy mapping
                Rec_ApprovalPos: signatoryPosition || currentData.Rec_ApprovalPos,
                Rec_AppDate: nowIso,
                recApproval: signatoryName,
                recApprovalPos: signatoryPosition || currentData.recApprovalPos,
                recAppDate: nowIso,
                cityAssessor: signatoryName,
                cityAssessorPos: signatoryPosition || currentData.cityAssessorPos,
                cityAssessorDate: nowIso
            };
            auditDetails.stage = 'Municipal Approval';
        } else if (status === 'approved') {
            // This is the "Provincial Approval" action
            updateData.data = {
                ...currentData,
                REM: remarks || currentData.REM,
                provincial_approver: actorEmail,
                provincial_approval_date: nowIso,
                Approved: signatoryName, // Legacy mapping
                ApprovedPos: signatoryPosition || currentData.ApprovedPos,
                ApprovedDate: nowIso,
                approved: signatoryName,
                approvedPos: signatoryPosition || currentData.approvedPos,
                approvedDate: nowIso,
                provAssessor: signatoryName,
                provAssessorPos: signatoryPosition || currentData.provAssessorPos,
                provAssessorDate: nowIso,
                SGD_APPROVED: true
            };
            auditDetails.stage = 'Provincial Approval';
        } else if (status.includes('rejected')) {
             updateData.data = {
                ...currentData,
                REM: remarks
            };
        } else if (remarks) {
             updateData.data = {
                ...currentData,
                REM: remarks
            };
        }

        // 5. Update record
        const record = await supabasePrisma.faasRecord.update({
            where: { id },
            data: updateData
        });

        // 6. Audit Log
        await this.logAudit('UPDATE_STATUS', id, auditDetails, userEmail, userId);
        
        // 7. Mock Notification (Log)
        if (status === 'pending-municipal') {
            logger.info(`[NOTIFICATION] Alerting Municipal Assessors: New record ${currentRecord.tdn || id} pending review.`);
        } else if (status === 'pending-provincial') {
            logger.info(`[NOTIFICATION] Alerting Provincial Assessors: Record ${currentRecord.tdn || id} approved by Municipal, pending Provincial review.`);
        } else if (status === 'approved') {
            logger.info(`[NOTIFICATION] Alerting Owner/Municipal: Record ${currentRecord.tdn || id} fully APPROVED.`);
        } else if (status.includes('rejected')) {
            logger.info(`[NOTIFICATION] Alerting Submitter: Record ${currentRecord.tdn || id} REJECTED.`);
        }

        return record;
    } catch (error) {
        logger.error('Error in FaasService.updateStatus:', error);
        throw new AppError(error.message, error.statusCode || 500);
    }
  }

  /**
   * Batch update FAAS record status
   * @param {string[]} ids 
   * @param {string} status 
   * @param {string} remarks 
   * @param {string} userEmail 
   * @param {string} userId 
   */
  async batchUpdateStatus(ids, status, remarks, userEmail, userId, approverName, approverPosition) {
    try {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new AppError('No IDs provided for batch update', 400);
        }

        const results = {
            success: [],
            failed: []
        };

        const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

        if (status === 'pending-provincial' || status === 'approved' || (typeof status === 'string' && status.includes('rejected'))) {
            const rows = await supabasePrisma.faasRecord.findMany({
                where: { id: { in: uniqueIds } },
                select: { id: true, status: true }
            });
            const byId = new Map(rows.map(r => [r.id, r]));

            const eligible = [];
            for (const id of uniqueIds) {
                const r = byId.get(id);
                if (!r) {
                    results.failed.push({ id, error: 'Record not found' });
                    continue;
                }

                try {
                    if (status === 'pending-provincial') {
                        if (r.status !== 'pending-municipal' && r.status !== 'for-review') {
                            throw new AppError('Cannot move to Provincial Approval. Municipal Approval required first.', 400);
                        }
                    }
                    if (status === 'approved') {
                        if (r.status !== 'pending-provincial') {
                            throw new AppError('Cannot approve. Provincial Approval required.', 400);
                        }
                    }
                    eligible.push(id);
                } catch (e) {
                    results.failed.push({ id, error: e?.message || 'Invalid transition' });
                }
            }

            if (!eligible.length) return results;

            const nowIso = new Date().toISOString();
            const actorEmail = userEmail;
            const signatoryName = approverName || userEmail;
            const signatoryPosition = approverPosition || null;
            const auditDetails =
                status === 'pending-provincial'
                    ? { status, remarks, stage: 'Municipal Approval', bulk: true }
                    : status === 'approved'
                      ? { status, remarks, stage: 'Provincial Approval', bulk: true }
                      : { status, remarks, bulk: true };

            await supabasePrisma.$transaction(async (tx) => {
                if (status === 'pending-provincial') {
                    await tx.$executeRawUnsafe(
                        `
                        UPDATE ${DB_SCHEMA}.faas_records
                        SET
                          status = $1,
                          updated_at = NOW(),
                          data =
                            jsonb_set(
                              jsonb_set(
                                jsonb_set(
                                  jsonb_set(
                                    COALESCE(data, '{}'::jsonb),
                                    '{REM}',
                                    to_jsonb(COALESCE($2, data->>'REM')),
                                    true
                                  ),
                                  '{municipal_approver}',
                                  to_jsonb($7),
                                  true
                                ),
                                '{municipal_approval_date}',
                                to_jsonb($4),
                                true
                              ),
                              '{Rec_Approval}',
                              to_jsonb($3),
                              true
                            )
                            || jsonb_build_object('Rec_AppDate', $4)
                            || jsonb_build_object('recAppDate', $4)
                            || jsonb_build_object('recApproval', $3)
                            || jsonb_build_object('cityAssessor', $3)
                            || jsonb_build_object('cityAssessorPos', COALESCE($6::text, data->>'cityAssessorPos'))
                            || jsonb_build_object('cityAssessorDate', $4)
                            || CASE
                                 WHEN $6::text IS NULL THEN '{}'::jsonb
                                 ELSE jsonb_build_object('Rec_ApprovalPos', $6)
                               END
                            || CASE
                                 WHEN $6::text IS NULL THEN '{}'::jsonb
                                 ELSE jsonb_build_object('recApprovalPos', $6)
                               END
                        WHERE id::uuid = ANY($5::uuid[])
                        `,
                        status,
                        remarks || null,
                        signatoryName,
                        nowIso,
                        eligible,
                        signatoryPosition,
                        actorEmail
                    );
                } else if (status === 'approved') {
                    await tx.$executeRawUnsafe(
                        `
                        UPDATE ${DB_SCHEMA}.faas_records
                        SET
                          status = $1,
                          updated_at = NOW(),
                          data =
                            jsonb_set(
                              jsonb_set(
                                jsonb_set(
                                  jsonb_set(
                                    jsonb_set(
                                      COALESCE(data, '{}'::jsonb),
                                      '{REM}',
                                      to_jsonb(COALESCE($2, data->>'REM')),
                                      true
                                    ),
                                    '{provincial_approver}',
                                     to_jsonb($7),
                                    true
                                  ),
                                  '{provincial_approval_date}',
                                  to_jsonb($4),
                                  true
                                ),
                                '{Approved}',
                                to_jsonb($3),
                                true
                              ),
                              '{ApprovedDate}',
                              to_jsonb($4),
                              true
                            )
                            || jsonb_build_object('SGD_APPROVED', true)
                            || jsonb_build_object('approved', $3)
                            || jsonb_build_object('ApprovedDate', $4)
                            || jsonb_build_object('approvedDate', $4)
                            || jsonb_build_object('provAssessor', $3)
                            || jsonb_build_object('provAssessorPos', COALESCE($6::text, data->>'provAssessorPos'))
                            || jsonb_build_object('provAssessorDate', $4)
                            || CASE
                                 WHEN $6::text IS NULL THEN '{}'::jsonb
                                 ELSE jsonb_build_object('ApprovedPos', $6)
                               END
                            || CASE
                                 WHEN $6::text IS NULL THEN '{}'::jsonb
                                 ELSE jsonb_build_object('approvedPos', $6)
                               END
                        WHERE id::uuid = ANY($5::uuid[])
                        `,
                        status,
                        remarks || null,
                        signatoryName,
                        nowIso,
                        eligible,
                        signatoryPosition,
                        actorEmail
                    );
                } else {
                    await tx.$executeRawUnsafe(
                        `
                        UPDATE ${DB_SCHEMA}.faas_records
                        SET
                          status = $1,
                          updated_at = NOW(),
                          data = jsonb_set(COALESCE(data, '{}'::jsonb), '{REM}', to_jsonb($2), true)
                        WHERE id::uuid = ANY($3::uuid[])
                        `,
                        status,
                        remarks || null,
                        eligible
                    );
                }

                await tx.auditLog.createMany({
                    data: eligible.map((id) => ({
                        tableName: 'faas_records',
                        recordId: id,
                        action: 'UPDATE_STATUS',
                        userEmail,
                        userId,
                        details: auditDetails,
                        timestamp: new Date(),
                    }))
                });
            }, { timeout: 60000 });

            results.success.push(...eligible);
            return results;
        }

        for (const id of uniqueIds) {
            try {
                await this.updateStatus(id, status, remarks, userEmail, userId);
                results.success.push(id);
            } catch (error) {
                results.failed.push({ id, error: error?.message || 'Unknown error' });
            }
        }

        return results;
    } catch (error) {
        logger.error('Error in FaasService.batchUpdateStatus:', error);
        throw new AppError(error.message, error.statusCode || 500);
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

  async getTdnHistory(id) {
    try {
      const rp = await supabasePrisma.$queryRawUnsafe(
        `SELECT master_property_id
         FROM ${DB_SCHEMA}.rpt_property
         WHERE source_record_id = $1
         LIMIT 1`,
        id
      );
      let masterPropertyId = rp?.[0]?.master_property_id || null;

      let faas = null;
      if (!masterPropertyId) {
        faas = await supabasePrisma.faasRecord.findUnique({ where: { id } });
        if (!faas) return [];

        const data = faas.data || {};
        const muncode = data.cityCode || data.CITY || null;
        const barangayCode = data.barangayCode || data['BRGY.CODE'] || null;
        const pin = data.PIN || data.pin || null;
        const newTdn = data.TDN || data.tdn || faas.tdn || null;
        const oldTdn =
          data.P_OLD_TDN ||
          data.pOldTdn ||
          data.pOldTDN ||
          data.OLD_TDN ||
          data.old_tdn ||
          null;
        const arpNo = data.ARP || data.arp || data.ARP_NO || data.arpNo || null;
        const lotNo = data.LOT_NO || data.lotNo || data.lot || null;
        const blockNo = data.BLOCK_NO || data.blockNo || data.block || null;

        if (!muncode || !barangayCode) return [];

        if (pin) {
          const matches = await supabasePrisma.$queryRawUnsafe(
            `SELECT id
             FROM ${DB_SCHEMA}.properties
             WHERE municipality_code = $1
               AND barangay_code = $2
               AND pin = $3
             LIMIT 2`,
            muncode,
            barangayCode,
            pin
          );
          if (matches.length === 1) masterPropertyId = matches[0].id;
        }

        if (!masterPropertyId && oldTdn) {
          const matches = await supabasePrisma.$queryRawUnsafe(
            `SELECT property_id
             FROM ${DB_SCHEMA}.property_tdn_history
             WHERE tdn = $1
             ORDER BY created_at DESC
             LIMIT 2`,
            oldTdn
          );
          if (matches.length === 1) masterPropertyId = matches[0].property_id;
        }

        if (!masterPropertyId && newTdn) {
          const matches = await supabasePrisma.$queryRawUnsafe(
            `SELECT property_id
             FROM ${DB_SCHEMA}.property_tdn_history
             WHERE tdn = $1 AND is_current = TRUE
             ORDER BY created_at DESC
             LIMIT 2`,
            newTdn
          );
          if (matches.length === 1) masterPropertyId = matches[0].property_id;
        }

        if (!masterPropertyId && lotNo && blockNo) {
          const matches = await supabasePrisma.$queryRawUnsafe(
            `SELECT id
             FROM ${DB_SCHEMA}.properties
             WHERE municipality_code = $1
               AND barangay_code = $2
               AND lot_no = $3
               AND block_no = $4
             LIMIT 2`,
            muncode,
            barangayCode,
            lotNo,
            blockNo
          );
          if (matches.length === 1) masterPropertyId = matches[0].id;
        }

        if (!masterPropertyId && arpNo) {
          const matches = await supabasePrisma.$queryRawUnsafe(
            `SELECT id
             FROM ${DB_SCHEMA}.properties
             WHERE municipality_code = $1
               AND barangay_code = $2
               AND arp_no = $3
             LIMIT 2`,
            muncode,
            barangayCode,
            arpNo
          );
          if (matches.length === 1) masterPropertyId = matches[0].id;
        }
      }

      if (!masterPropertyId) return [];

      const rows = await supabasePrisma.$queryRawUnsafe(
        `SELECT
           h.id,
           h.tdn,
           h.old_tdn as "previousTdn",
           rp.pin,
           COALESCE(
             to_char(make_date(h.tax_beg_year, 1, 1), 'YYYY-MM-DD'),
             rp.tax_beg_yr
           ) as "effectivityDate",
           COALESCE(rp.owner_id::text, '') as "ownerCode",
           COALESCE(rp.owner_name_snapshot, '') as "declaredOwner",
           COALESCE(SUM(ra.market_value), 0) as "prevMarketValue",
           COALESCE(SUM(ra.ass_value), 0) as "prevAssessedValue",
           h.tax_beg_year as "taxBegYear",
           h.is_current as "isCurrent",
           h.change_reason as "changeReason"
         FROM ${DB_SCHEMA}.property_tdn_history h
         LEFT JOIN ${DB_SCHEMA}.rpt_property rp
           ON rp.source_record_id = h.source_record_id
         LEFT JOIN ${DB_SCHEMA}.rpt_assessment ra
           ON ra.property_id = rp.id
         WHERE h.property_id = $1::uuid
         GROUP BY
           h.id,
           h.tdn,
           h.old_tdn,
           h.tax_beg_year,
           h.is_current,
           h.change_reason,
           rp.pin,
           rp.tax_beg_yr,
           rp.owner_id,
           rp.owner_name_snapshot
         ORDER BY
           h.tax_beg_year DESC NULLS LAST,
           h.created_at DESC`,
        String(masterPropertyId)
      );

      return rows.map((r) => ({
        ...r,
        prevMarketValue: Number(r.prevMarketValue || 0),
        prevAssessedValue: Number(r.prevAssessedValue || 0),
      }));
    } catch (error) {
      logger.error('Error in FaasService.getTdnHistory:', error);
      throw new AppError(error.message, 500);
    }
  }

  /**
   * Bulk Migrate Properties
   * @param {Array} properties 
   * @param {string} migrationType 
   * @param {string} userEmail 
   * @param {string} userId 
   * @param {boolean} skipExisting
   */
  async bulkMigrate(properties, migrationType, userEmail, userId, skipExisting = false) {
    logger.info(`Starting bulk migration for ${properties.length} properties. Type: ${migrationType}, SkipExisting: ${skipExisting}`);
    
    const results = [];
    
    try {
      // If skipExisting is true, find which ones to skip first
      let tdnsToSkip = [];
      if (skipExisting) {
        const tdns = properties.map(p => (p.data?.TDN || p.tdn));
        const existing = await supabasePrisma.faasRecord.findMany({
          where: { tdn: { in: tdns } },
          select: { tdn: true }
        });
        tdnsToSkip = existing.map(e => e.tdn);
      }

      await supabasePrisma.$transaction(async (tx) => {
        for (const property of properties) {
          try {
            const propertyData = property.data || property;
            const tdn = propertyData.TDN || propertyData.tdn;
            
            // Clean PIN if present in propertyData
            if (propertyData.PIN) {
              propertyData.PIN = propertyData.PIN.replace(/s+/g, '');
            } else if (propertyData.pin) {
              propertyData.pin = propertyData.pin.replace(/\s+/g, '');
            }
            
            if (!tdn) {
              throw new Error(`Property at index ${properties.indexOf(property)} is missing TDN`);
            }

            if (skipExisting && tdnsToSkip.includes(tdn)) {
              logger.info(`Skipping existing property ${tdn} during bulk migration`);
              results.push({
                id: property.id,
                tdn: tdn,
                status: 'skipped',
                message: 'Property already exists in Supabase, skipped as requested'
              });
              continue;
            }

            // --- FIX: Fetch assessments if missing ---
            if (!propertyData.assessments || !Array.isArray(propertyData.assessments) || propertyData.assessments.length === 0) {
              logger.info(`Fetching assessments for property ${tdn} from MSSQL`);
              const assResult = await rptAssService.getAll({ filters: { TDN: tdn } });
              if (assResult && assResult.data) {
                propertyData.assessments = assResult.data;
              }
            }
            // ----------------------------------------

            // 1. Upsert the FAAS Record (Direct to pending-municipal for approval)
            const record = await tx.faasRecord.upsert({
              where: { tdn: tdn },
              update: {
                status: 'pending-municipal',
                updatedAt: new Date(),
                data: propertyData,
                createdBy: userEmail
              },
              create: {
                tdn: tdn,
                status: 'pending-municipal',
                createdBy: userEmail,
                data: propertyData
              }
            });

            // 2. Create Audit Log
            await tx.auditLog.create({
              data: {
                tableName: 'faas_records',
                recordId: record.id,
                action: 'BULK_MIGRATE',
                userEmail: userEmail,
                userId: userId,
                details: {
                  tdn: tdn,
                  migrationType: migrationType,
                  message: `Property ${tdn} migrated and submitted for approval (pending-municipal)`
                },
                timestamp: new Date()
              }
            });

            results.push({
              id: property.id,
              tdn: tdn,
              status: 'success',
              message: 'Migration successful'
            });
          } catch (err) {
            logger.error(`Failed to migrate property ${property.tdn || 'unknown'}: ${err.message}`);
            // Rethrow to trigger transaction rollback
            throw err;
          }
        }
      }, {
        timeout: 60000, // Increase timeout to 60 seconds for bulk operations
        maxWait: 5000   // Max time to wait for a connection
      });

      return results;
    } catch (error) {
      logger.error(`Bulk migration transaction failed: ${error.message}`);
      // Return the error so frontend can show which property caused the rollback
      throw new AppError(`Bulk migration failed. All changes rolled back. Reason: ${error.message}`, 500);
    }
  }

  /**
   * Check which TDNs already exist in Supabase
   * @param {Array} tdns 
   * @returns {Promise<Array>} List of existing TDNs
   */
  async checkExistingTdns(tdns) {
    try {
      const existing = await supabasePrisma.faasRecord.findMany({
        where: { tdn: { in: tdns } },
        select: { tdn: true }
      });
      return existing.map(e => e.tdn);
    } catch (error) {
      logger.error('Error checking existing TDNs:', error);
      throw new AppError('Failed to check existing properties', 500);
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
        const isTDN = searchField.toUpperCase() === 'TDN';
        let cleanValue = filterValue;
        
        let stringFilter = { contains: cleanValue, mode: 'insensitive' };
        
        // Parse SQL-like wildcards
        if (filterValue.includes('%')) {
            const startsWithWildcard = filterValue.startsWith('%');
            const endsWithWildcard = filterValue.endsWith('%');
            cleanValue = filterValue.replace(/^%+|%+$/g, '');
            
            if (startsWithWildcard && endsWithWildcard) {
                stringFilter = { contains: cleanValue, mode: 'insensitive' };
            } else if (startsWithWildcard) {
                // If it starts with %, it means we want anything BEFORE the text, so it ENDS WITH the text
                stringFilter = { endsWith: cleanValue, mode: 'insensitive' };
            } else if (endsWithWildcard) {
                // If it ends with %, it means we want anything AFTER the text, so it STARTS WITH the text
                stringFilter = { startsWith: cleanValue, mode: 'insensitive' };
            }
        } else {
            // Default to contains if no wildcards are explicitly used
            cleanValue = filterValue;
            // The prompt says "can make search start only exam search 22-"
            // So if they type "22-" (or any TDN string), it should act like "22-%" (starts with).
            // However, this means if they search "00122", they won't find "03-02-00122" unless they use wildcards
            stringFilter = { startsWith: cleanValue }; // Remove mode: insensitive for startsWith
        }

        if (cleanValue) {
            switch (searchField.toUpperCase()) {
                case 'TDN':
                    // We must apply the filter to BOTH the top-level tdn column AND the nested JSON tdn property
                    // Since string_contains does not support startsWith, we can only safely query the top-level tdn column
                    // if it exists, OR we fallback to contains for data. But to enforce strict startsWith:
                    if (stringFilter.contains) {
                        where.OR = [
                            { tdn: { ...stringFilter, mode: 'insensitive' } },
                            { data: { string_contains: cleanValue } }
                        ];
                    } else {
                        // Strict startsWith / endsWith search
                        // Prisma allows path-based filtering for JSON in Postgres, but it's complex.
                        // Since TDN is often null in the top level if it's only saved as JSON in draft state,
                        // a strict startsWith on just `tdn` might miss drafts.
                        // To fix this across the board, we'll execute a raw SQL-like condition if possible, 
                        // but Prisma restricts this. The safest Prisma approach for startsWith in JSON 
                        // is not possible without raw queries. 
                        // So we search the top level tdn column for strict matching.
                        where.OR = [
                            { tdn: { ...stringFilter, mode: 'insensitive' } },
                            // Fallback to searching the nested JSON properties since some TDNs might only be in JSON
                            // However, since Prisma JSON string_contains doesn't support startsWith natively,
                            // we'll just allow string_contains on the tdn path specifically as a compromise
                            // so that we don't return completely empty results if tdn is only in JSON
                            { data: { path: ['tdn'], string_contains: cleanValue } },
                            { data: { path: ['TDN'], string_contains: cleanValue } }
                        ];
                    }
                    break;
                case 'TAX_BEG_YR':
                    where.data = { path: ['TAX_BEG_YR'], equals: cleanValue };
                    break;
                default:
                    // For OWNER, PIN, ARP, etc., we just do a string_contains on the whole JSON object
                    // This is much safer than trying to guess the exact JSON path and case sensitivity
                    where.data = { string_contains: cleanValue };
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

  /**
   * Get distinct Tax Beginning Years
   * @returns {Promise<string[]>}
   */
  async getDistinctTaxBegYears() {
    try {
      // For Supabase Postgres JSONB columns
      // If we cannot use $queryRaw easily due to quotes and syntax in Prisma,
      // let's fetch all TAX_BEG_YR values directly using Prisma's standard API, 
      // which is safer and less prone to raw query syntax errors.
      
      const records = await supabasePrisma.faasRecord.findMany({
        select: {
          data: true
        }
      });
      
      const years = new Set();
      
      for (const record of records) {
          if (record.data && record.data.TAX_BEG_YR) {
              years.add(String(record.data.TAX_BEG_YR).trim());
          }
      }
      
      return Array.from(years).sort().reverse();
    } catch (error) {
      logger.error('Error fetching distinct tax beginning years:', error);
      throw new AppError('Failed to fetch distinct tax beginning years', 500);
    }
  }
}

module.exports = new FaasService();
