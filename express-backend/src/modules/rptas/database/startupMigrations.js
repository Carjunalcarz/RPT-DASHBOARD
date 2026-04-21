const fs = require('fs/promises');
const path = require('path');
const logger = require('../../../utils/logger');
const { supabasePrisma } = require('./prisma');

function splitSqlStatements(sql) {
  const withoutLineComments = sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');

  return withoutLineComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function runSqlFile(filePath, client) {
  const sql = await fs.readFile(filePath, 'utf8');
  const statements = splitSqlStatements(sql);
  for (const stmt of statements) {
    await client.$executeRawUnsafe(stmt);
  }
}

async function runSupabaseStartupMigrations() {
  const envValue = process.env.RUN_SUPABASE_STARTUP_MIGRATIONS;
  const enabled =
    envValue === undefined || String(envValue).trim() === ''
      ? String(process.env.NODE_ENV || '').toLowerCase() === 'development'
      : String(envValue).toLowerCase() === 'true';
  if (!enabled) return;

  try {
    const baseDir = __dirname;
    const migrations = [
      path.join(baseDir, 'supabase_bldg_unit_cost_sets.sql'),
    ];

    for (const file of migrations) {
      await runSqlFile(file, supabasePrisma);
      logger.info(`Startup migration applied: ${path.basename(file)}`);
    }
  } catch (error) {
    logger.error('Startup migration failed (Supabase).', error);
  }
}

module.exports = {
  runSupabaseStartupMigrations,
};
