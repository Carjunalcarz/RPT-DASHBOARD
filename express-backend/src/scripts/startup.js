/**
 * Startup Script for RPT Dashboard Backend
 * Handles database connectivity verification, migrations, and health checks.
 */
const { execSync } = require('child_process');
const { PrismaClient: MssqlClient } = require('../generated/mssql-client');
const { PrismaClient: SupabaseClient } = require('../generated/supabase-client-v6');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function runReportingSetup(client) {
  logger.info('[Startup] Setting up reporting schema and ETL...');
  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'reporting_setup.sql');
    if (!fs.existsSync(sqlPath)) {
      logger.warn(`[Startup] Reporting setup SQL file not found at ${sqlPath}. Skipping.`);
      return true;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements while handling $$ blocks for functions
    const statements = [];
    let currentStatement = '';
    let inDollarBlock = false;
    const lines = sqlContent.split('\n');

    for (let line of lines) {
      currentStatement += line + '\n';
      
      // Check for $$ delimiters
      const dollarMatches = line.match(/\$\$/g);
      if (dollarMatches && dollarMatches.length % 2 !== 0) {
        inDollarBlock = !inDollarBlock;
      }

      // If not in a dollar block and line ends with a semicolon (optionally followed by comments)
      if (!inDollarBlock && /;\s*(--.*)?$/.test(line)) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    // Execute statements one by one
    for (const stmt of statements) {
      const cleanStmt = stmt.trim();
      // Skip if statement is purely comments or empty
      if (cleanStmt && cleanStmt.length > 0 && !cleanStmt.split('\n').every(l => l.trim().startsWith('--') || l.trim() === '')) {
        try {
          // logger.debug(`[Startup] Executing statement: ${cleanStmt.substring(0, 50)}...`);
          await client.$executeRawUnsafe(cleanStmt);
        } catch (stmtError) {
          logger.error(`[Startup] Error executing SQL statement: ${stmtError.message}\nStatement: ${cleanStmt.substring(0, 200)}...`);
          throw stmtError; // Re-throw to be caught by the outer catch
        }
      }
    }
    
    logger.info('[Startup] Reporting schema and ETL functions updated successfully.');

    // Trigger initial ETL refresh if requested
    const shouldRefresh = process.env.REFRESH_REPORTING_ON_STARTUP === 'true';
    if (shouldRefresh) {
      logger.info('[Startup] Triggering initial reporting data refresh...');
      await client.$executeRawUnsafe('SELECT public.refresh_reporting_data();');
      logger.info('[Startup] Reporting data refresh completed.');
    }

    return true;
  } catch (error) {
    logger.error(`[Startup] Failed to setup reporting: ${error.message}`);
    return false;
  }
}

async function verifyDatabaseConnectivity(client, name) {
  logger.info(`[Startup] Verifying connectivity to ${name}...`);
  try {
    await client.$connect();
    // Simple query to verify
    if (name === 'Supabase') {
      await client.$queryRaw`SELECT 1`;
    } else {
      await client.$queryRaw`SELECT 1 as result`;
    }
    logger.info(`[Startup] Successfully connected to ${name}.`);
    return true;
  } catch (error) {
    logger.error(`[Startup] Failed to connect to ${name}: ${error.message}`);
    return false;
  }
}

async function runMigrations(schemaPath, name) {
  logger.info(`[Startup] Running pending migrations for ${name} using schema ${schemaPath}...`);
  try {
    // Check if migrations folder exists and has content
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    
    // For MSSQL, we might not have migrations in the same folder if they are PG specific
    // Let's check the schema to see if it's the primary target
    if (name === 'MSSQL') {
      logger.info(`[Startup] Skipping migrations for MSSQL as it is likely a read-only or externally managed source.`);
      return true;
    }

    // Check migration status first
    const statusCmd = `npx prisma migrate status --schema=${schemaPath}`;
    logger.info(`[Startup] Checking migration status for ${name}...`);
    try {
      const statusOutput = execSync(statusCmd, { encoding: 'utf8', stdio: 'pipe' });
      logger.info(`[Startup] Migration status for ${name}: ${statusOutput.trim()}`);
      if (statusOutput.includes('Database is up to date')) {
        return true;
      }
    } catch (statusError) {
      logger.info(`[Startup] Pending migrations detected or status check failed for ${name}.`);
    }

    // Run migrations
    const deployCmd = `npx prisma migrate deploy --schema=${schemaPath}`;
    const deployOutput = execSync(deployCmd, { encoding: 'utf8' });
    logger.info(`[Startup] Migration deploy output for ${name}: ${deployOutput.trim()}`);
    
    // Verify again
    try {
      const finalStatus = execSync(statusCmd, { encoding: 'utf8' });
      if (finalStatus.includes('Database is up to date')) {
        logger.info(`[Startup] Migrations successfully verified for ${name}.`);
      }
    } catch (e) {
      throw new Error(`Migration verification failed for ${name} after deployment.`);
    }

    return true;
  } catch (error) {
    logger.error(`[Startup] Migration failed for ${name}: ${error.message}`);
    return false;
  }
}

async function runHealthCheck(client, name) {
  logger.info(`[Startup] Performing final health check for ${name}...`);
  try {
    if (name === 'Supabase') {
      // Check for essential tables
      const faasCount = await client.faasRecord.count();
      logger.info(`[Startup] Health check: Found ${faasCount} FAAS records.`);
      
      // Check if reporting tables exist (using raw SQL as they might not be in Prisma schema yet)
      const tablesCheck = await client.$queryRaw`
        SELECT count(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('owner', 'municipality', 'barangay', 'rpt_property', 'rpt_assessment')
      `;
      const tableCount = Number(tablesCheck[0].count);
      logger.info(`[Startup] Health check: Found ${tableCount}/5 reporting tables.`);
      
      if (tableCount < 5) {
        logger.warn(`[Startup] Warning: Some reporting tables are missing. Reporting features may be degraded.`);
      } else {
        // Check if any data exists in reporting
        const propCheck = await client.$queryRaw`SELECT count(*) FROM public.rpt_property`;
        const propCount = Number(propCheck[0].count);
        if (propCount === 0 && faasCount > 0) {
          logger.info('[Startup] Health check: Reporting data is empty but FAAS records exist. Triggering initial refresh...');
          await client.$executeRawUnsafe('SELECT public.refresh_reporting_data();');
          logger.info('[Startup] Reporting data refresh completed.');
        }
      }
    } else {
      // MSSQL specific check
      const result = await client.$queryRaw`SELECT TOP 1 * FROM RPTMAST`;
      logger.info(`[Startup] Health check: RPTMAST accessible.`);
    }
    return true;
  } catch (error) {
    logger.error(`[Startup] Health check failed for ${name}: ${error.message}`);
    return false;
  }
}

async function startup() {
  const startTime = Date.now();
  logger.info('[Startup] Beginning deployment process...');

  const mssqlBase = new MssqlClient();
  const supabaseBase = new SupabaseClient();

  try {
    // 1. Verify Connectivity
    const mssqlOk = await verifyDatabaseConnectivity(mssqlBase, 'MSSQL');
    const supabaseOk = await verifyDatabaseConnectivity(supabaseBase, 'Supabase');

    const allowMssqlFailure = process.env.ALLOW_MSSQL_FAILURE === 'true';

    if (!supabaseOk) {
      logger.error('[Startup] Critical: Primary database (Supabase) connectivity check failed. Aborting startup.');
      process.exit(1);
    }

    if (!mssqlOk) {
      if (allowMssqlFailure) {
        logger.warn('[Startup] Warning: MSSQL connectivity check failed, but ALLOW_MSSQL_FAILURE is true. Proceeding with caution.');
      } else {
        logger.error('[Startup] Critical: MSSQL connectivity check failed. Set ALLOW_MSSQL_FAILURE=true to bypass this check if MSSQL is optional. Aborting startup.');
        process.exit(1);
      }
    }

    // 2. Run Migrations
    // Only run migrations for Supabase as MSSQL is usually read-only/externally managed
    const supabaseMigrateOk = await runMigrations('./prisma/schema.supabase.prisma', 'Supabase');

    if (!supabaseMigrateOk) {
      logger.error('[Startup] Critical: Supabase database migration failed. Aborting startup.');
      process.exit(1);
    }

    // 3. Reporting Setup
    const reportingOk = await runReportingSetup(supabaseBase);
    if (!reportingOk) {
      logger.warn('[Startup] Warning: Reporting setup failed. Reporting features may be unavailable.');
      // We don't exit here as the main app can still run without reporting
    }

    // 4. Health Checks
    const supabaseHealthOk = await runHealthCheck(supabaseBase, 'Supabase');
    if (!supabaseHealthOk) {
      logger.error('[Startup] Critical: Supabase health check failed. Aborting startup.');
      process.exit(1);
    }

    if (mssqlOk) {
      const mssqlHealthOk = await runHealthCheck(mssqlBase, 'MSSQL');
      if (!mssqlHealthOk) {
        logger.warn('[Startup] Warning: MSSQL health check failed. Legacy data features may be unavailable.');
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    logger.info(`[Startup] Deployment process completed successfully in ${duration}s. Starting application server...`);
    
    // Disconnect clients before handing off to the main app
    await mssqlBase.$disconnect();
    await supabaseBase.$disconnect();

  } catch (error) {
    logger.error(`[Startup] Unexpected error during startup: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  startup();
}

module.exports = startup;
