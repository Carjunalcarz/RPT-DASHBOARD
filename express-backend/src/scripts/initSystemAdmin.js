#!/usr/bin/env node
/**
 * One-shot system-administration bootstrap.
 *
 *   1. Apply src/modules/rptas/database/supabase_system_admin_rbac.sql
 *      directly via Prisma's $executeRawUnsafe. The SQL is fully idempotent
 *      (CREATE ... IF NOT EXISTS + DO-block guarded RLS policies), so this
 *      bypasses Prisma's migration tracker entirely — safe to run against
 *      a fresh DB OR an existing DB that already has the tables from
 *      LocalGovernmentUnit/supabase/migrations/005_public_rbac_tables.sql.
 *
 *   2. Run prisma/seed.systemAdmin.js to upsert default roles, the
 *      system-admin module catalog, and role_permissions for the default
 *      roles. Also idempotent.
 *
 * Run with:
 *   npm run system-admin:init
 *
 * Flags forwarded to the seed:
 *   --dry-run    seed runs in preview mode (no writes)
 *
 * Required env:
 *   SUPABASE_DB_URL
 *   SUPABASE_DIRECT_URL
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../');
const SQL_FILE = path.join(
  ROOT, 'src', 'modules', 'rptas', 'database', 'supabase_system_admin_rbac.sql'
);
const SEED = path.join(ROOT, 'prisma', 'seed.systemAdmin.js');

function assertEnv() {
  const missing = ['SUPABASE_DB_URL', 'SUPABASE_DIRECT_URL'].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function applySqlMigration() {
  console.log('\n=== Apply system-admin RBAC SQL ===');
  console.log(`reading: ${SQL_FILE}`);
  if (!fs.existsSync(SQL_FILE)) {
    console.error(`!! SQL file not found at ${SQL_FILE}`);
    process.exit(1);
  }

  const { splitSqlStatementsSmart } = require(
    '../modules/rptas/database/startupMigrations'
  );
  const { PrismaClient } = require('../generated/supabase-client-v6');
  const prisma = new PrismaClient();

  try {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    const statements = splitSqlStatementsSmart(sql);
    console.log(`executing ${statements.length} statement(s)...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err) {
        console.error(`!! statement ${i + 1}/${statements.length} failed:`);
        console.error(`   ${stmt.slice(0, 120)}...`);
        console.error(`   ${err.message}`);
        throw err;
      }
    }
    console.log('SQL migration applied successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

function runSeed() {
  console.log('\n=== Seed system-admin catalog ===');
  const result = spawnSync('node', [SEED, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: ROOT,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`!! Seed failed (exit ${result.status})`);
    process.exit(result.status || 1);
  }
}

async function main() {
  assertEnv();
  await applySqlMigration();
  runSeed();
  console.log('\nSystem-admin init complete.');
}

// Only run when invoked as a script, not when required (avoids running
// against a real DB during smoke tests / `require()` checks).
if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { applySqlMigration };
