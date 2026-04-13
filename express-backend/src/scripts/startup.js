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
const { DB_SCHEMA } = require('../modules/rptas/config/database');

async function runReportingSetup(client) {
  logger.info('[Startup] Setting up reporting schema and ETL...');
  try {
    const sqlPath = path.join(__dirname, '..', 'modules', 'rptas', 'database', 'reporting_setup.sql');
    if (!fs.existsSync(sqlPath)) {
      logger.warn(`[Startup] Reporting setup SQL file not found at ${sqlPath}. Skipping.`);
      return true;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8').replace(/__DB_SCHEMA__/g, DB_SCHEMA);

    const statements = [];
    let currentStatement = '';
    let inDollarBlock = false;
    const lines = sqlContent.split('\n');

    for (let line of lines) {
      currentStatement += line + '\n';

      const dollarMatches = line.match(/\$\$/g);
      if (dollarMatches && dollarMatches.length % 2 !== 0) {
        inDollarBlock = !inDollarBlock;
      }

      if (!inDollarBlock && /;\s*(--.*)?$/.test(line)) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    for (const stmt of statements) {
      const cleanStmt = stmt.trim();
      if (
        cleanStmt &&
        cleanStmt.length > 0 &&
        !cleanStmt.split('\n').every((l) => l.trim().startsWith('--') || l.trim() === '')
      ) {
        await client.$executeRawUnsafe(cleanStmt);
      }
    }

    logger.info('[Startup] Reporting schema and ETL functions updated successfully.');

    const shouldRefresh = process.env.REFRESH_REPORTING_ON_STARTUP === 'true';
    if (shouldRefresh) {
      logger.info('[Startup] Triggering initial reporting data refresh...');
      await client.$executeRawUnsafe(`SELECT ${DB_SCHEMA}.refresh_reporting_data();`);
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
    if (name === 'Supabase') {
      await client.$queryRawUnsafe(`SELECT 1`);
    } else {
      await client.$queryRawUnsafe(`SELECT 1 as result`);
    }
    logger.info(`[Startup] Successfully connected to ${name}.`);
    return true;
  } catch (error) {
    logger.error(`[Startup] Failed to connect to ${name}: ${error.message}`);
    return false;
  }
}

async function ensureSupabaseExtensions(client) {
  try {
    await client.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
  } catch (error) {
    logger.warn(`[Startup] Unable to ensure unaccent extension: ${error.message}`);
  }

  try {
    await client.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  } catch (error) {
    logger.warn(`[Startup] Unable to ensure pg_trgm extension: ${error.message}`);
  }

  try {
    const rows = await client.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE p.proname = 'unaccent'
       AND p.pronargs = 1
       AND n.nspname = $1`,
      DB_SCHEMA
    );
    const exists = Array.isArray(rows) && rows[0] && Number(rows[0].count) > 0;
    if (!exists) {
      await client.$executeRawUnsafe(
        `CREATE OR REPLACE FUNCTION ${DB_SCHEMA}.unaccent(input text)
         RETURNS text
         LANGUAGE sql
         IMMUTABLE
         AS $$ SELECT input $$;`
      );
      logger.warn('[Startup] Installed fallback unaccent(text) function in DB schema.');
    }
  } catch (error) {
    logger.warn(`[Startup] Unable to ensure unaccent function: ${error.message}`);
  }

  try {
    const rows = await client.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE p.proname = 'similarity'
       AND p.pronargs = 2
       AND n.nspname = $1`,
      DB_SCHEMA
    );
    const exists = Array.isArray(rows) && rows[0] && Number(rows[0].count) > 0;
    if (!exists) {
      try {
        await client.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION ${DB_SCHEMA}.similarity(a text, b text)
           RETURNS real
           LANGUAGE sql
           IMMUTABLE
           AS $$ SELECT public.similarity(a, b) $$;`
        );
        logger.warn('[Startup] Installed wrapper similarity(text,text) function in DB schema.');
      } catch (inner) {
        await client.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION ${DB_SCHEMA}.similarity(a text, b text)
           RETURNS real
           LANGUAGE sql
           IMMUTABLE
           AS $$ SELECT 0::real $$;`
        );
        logger.warn('[Startup] Installed fallback similarity(text,text) function in DB schema.');
      }
    }
  } catch (error) {
    logger.warn(`[Startup] Unable to ensure similarity function: ${error.message}`);
  }
}

async function runMigrations(schemaPath, name) {
  logger.info(`[Startup] Running pending migrations for ${name} using schema ${schemaPath}...`);
  try {
    if (name === 'MSSQL') {
      logger.info('[Startup] Skipping migrations for MSSQL as it is likely a read-only or externally managed source.');
      return true;
    }

    const deployCmd = `npx prisma migrate deploy --schema=${schemaPath}`;
    try {
      const deployOutput = execSync(deployCmd, { encoding: 'utf8' });
      logger.info(`[Startup] Migration deploy output for ${name}: ${deployOutput.trim()}`);
    } catch (deployError) {
      logger.warn(`[Startup] Migration deploy failed for ${name}, but continuing startup. Error: ${deployError.message}`);
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
      const faasCount = await client.faasRecord.count();
      logger.info(`[Startup] Health check: Found ${faasCount} FAAS records.`);

      const tablesCheck = await client.$queryRawUnsafe(`
        SELECT count(*)
        FROM information_schema.tables
        WHERE table_schema = '${DB_SCHEMA}'
        AND table_name IN ('owner', 'municipality', 'barangay', 'rpt_property', 'rpt_assessment')
      `);
      const tableCount = Number(tablesCheck[0].count);
      logger.info(`[Startup] Health check: Found ${tableCount}/5 reporting tables.`);

      if (tableCount < 5) {
        logger.warn('[Startup] Warning: Some reporting tables are missing. Reporting features may be degraded.');
      } else {
        const propCheck = await client.$queryRawUnsafe(`SELECT count(*) FROM ${DB_SCHEMA}.rpt_property`);
        const propCount = Number(propCheck[0].count);
        if (propCount === 0 && faasCount > 0) {
          logger.info('[Startup] Health check: Reporting data is empty but FAAS records exist. Triggering initial refresh...');
          await client.$executeRawUnsafe(`SELECT ${DB_SCHEMA}.refresh_reporting_data();`);
          logger.info('[Startup] Reporting data refresh completed.');
        }
      }
    } else {
      await client.$queryRawUnsafe(`SELECT TOP 1 * FROM RPTMAST`);
      logger.info('[Startup] Health check: RPTMAST accessible.');
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

    await ensureSupabaseExtensions(supabaseBase);

    const supabaseMigrateOk = await runMigrations('./prisma/schema.supabase.prisma', 'Supabase');
    if (!supabaseMigrateOk) {
      logger.error('[Startup] Critical: Supabase database migration failed. Aborting startup.');
      process.exit(1);
    }

    const reportingOk = await runReportingSetup(supabaseBase);
    if (!reportingOk) {
      logger.warn('[Startup] Warning: Reporting setup failed. Reporting features may be unavailable.');
    }

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

