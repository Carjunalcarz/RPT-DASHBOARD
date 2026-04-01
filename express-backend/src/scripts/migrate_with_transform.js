require('dotenv').config();
const fs = require('fs');
const path = require('path');
const rptMastService = require('../modules/rptas/services/rptMastService');
const { supabasePrisma } = require('../modules/rptas/database/prisma');
const { transformTdn, transformPin } = require('../utils/dataTransformation');
const logger = require('../utils/logger');

const BATCH_SIZE = 100;
const REPORT_FILE = path.join(__dirname, '../../migration_report.json');

async function migrateData() {
    console.log('Starting RPT Data Migration with Transformation...');
    const report = {
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        failures: [],
        transformations: [] // Sample of transformations
    };

    let page = 1;
    let hasMore = true;

    try {
        while (hasMore) {
            console.log(`Fetching batch ${page}...`);
            const result = await rptMastService.getAgusanMigrationData({ 
                page, 
                limit: BATCH_SIZE,
                // municipalityCode: 'ALL' // Uncomment if needed to fetch all
            });

            const records = result.data;
            if (records.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Processing ${records.length} records...`);

            for (const record of records) {
                report.totalProcessed++;
                const originalTdn = record.TDN;
                const originalPin = record.PIN;

                try {
                    // 1. Transform Data
                    const newTdn = transformTdn(originalTdn);
                    const newPin = transformPin(originalPin);
                    
                    // Transform references if they exist
                    const pOldTdn = record.P_OLD_TDN ? transformTdn(record.P_OLD_TDN) : record.P_OLD_TDN;
                    const pNewTdn = record.P_NEW_TDN ? transformTdn(record.P_NEW_TDN) : record.P_NEW_TDN;
                    const pPin = record.P_PIN ? transformPin(record.P_PIN) : record.P_PIN;

                    // Log transformation if changed (limit sample size)
                    if ((newTdn !== originalTdn || newPin !== originalPin) && report.transformations.length < 50) {
                        report.transformations.push({
                            originalTdn, newTdn,
                            originalPin, newPin
                        });
                    }

                    // 2. Validate Transformation Integrity
                    if (!isValidFormat(newTdn, 'TDN') || !isValidFormat(newPin, 'PIN')) {
                        throw new Error(`Transformation resulted in invalid format. TDN: ${newTdn}, PIN: ${newPin}`);
                    }

                    // 3. Prepare Data for Supabase
                    // Map fields from MSSQL structure to Supabase JSON structure
                    // Using the structure expected by FaasRecord
                    const faasData = {
                        ...record,
                        TDN: newTdn,
                        PIN: newPin,
                        tdn: newTdn, // Ensure lowercase fields are populated if used
                        pin: newPin,
                        pOldTdn,
                        pNewTdn,
                        pPin,
                        // Ensure owner info is mapped
                        owner: record.Owner_Name,
                        ownerNo: record.OWNER_NO,
                        // Add metadata about migration
                        migrationSource: 'MSSQL',
                        originalTdn: originalTdn,
                        originalPin: originalPin,
                        migrationDate: new Date().toISOString()
                    };

                    // 4. Save to Supabase
                    // We use upsert to handle idempotency (update if exists by ID or TDN?)
                    // Prisma doesn't support upsert by non-unique field easily unless defined.
                    // TDN is unique in our schema? Let's check schema.
                    // Assuming ID is the primary key. We can try to find by TDN first.
                    
                    // We generate a deterministic ID or check existence
                    const existing = await supabasePrisma.faasRecord.findFirst({
                        where: { tdn: newTdn }
                    });

                    if (existing) {
                        // Update
                        await supabasePrisma.faasRecord.update({
                            where: { id: existing.id },
                            data: {
                                tdn: newTdn,
                                status: 'migrated', // Distinct status for migrated records
                                data: faasData,
                                updatedAt: new Date()
                            }
                        });
                    } else {
                        // Create
                        await supabasePrisma.faasRecord.create({
                            data: {
                                tdn: newTdn,
                                status: 'migrated',
                                data: faasData,
                                createdBy: 'migration_script'
                            }
                        });
                    }

                    // 5. Log Success
                    report.successCount++;

                } catch (err) {
                    console.error(`Failed to migrate record ${originalTdn}:`, err.message);
                    report.failureCount++;
                    report.failures.push({
                        tdn: originalTdn,
                        error: err.message
                    });
                    // Rollback mechanism: Since we process per record, the "rollback" is essentially 
                    // not saving this record and logging the failure. 
                    // If we did a partial save (e.g. created record but failed log), we might need to delete.
                    // But here operations are atomic per record via Prisma.
                }
            }

            page++;
            // Safety break for testing
            // if (page > 2) break; 
        }

    } catch (error) {
        console.error('Migration Script Fatal Error:', error);
    } finally {
        // Write Report
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
        console.log(`Migration completed. Report saved to ${REPORT_FILE}`);
        console.log(`Processed: ${report.totalProcessed}`);
        console.log(`Success: ${report.successCount}`);
        console.log(`Failures: ${report.failureCount}`);
        
        // Explicitly close connections if needed
        // await supabasePrisma.$disconnect(); 
        // MSSQL pool usually handles itself but we can exit process
        process.exit(0);
    }
}

function isValidFormat(value, type) {
    if (!value) return true; // Allow empty if original was empty
    if (type === 'TDN') {
        // Expecting XX-XX-XXXX-XXXXX (16 chars) or close to it
        // The transformation adds a digit, so 15 -> 16.
        // We can check if the last part is 5 digits.
        const parts = value.split('-');
        const lastPart = parts[parts.length - 1];
        return /^\d{5}$/.test(lastPart);
    }
    if (type === 'PIN') {
        // Expecting XXX-XX-XXXX-XXX-XX-XXXXX
        const parts = value.split('-');
        const lastPart = parts[parts.length - 1];
        return /^\d{5}$/.test(lastPart);
    }
    return true;
}

// Run
migrateData();
