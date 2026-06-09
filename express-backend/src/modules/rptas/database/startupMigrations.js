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

// Dollar-quote-aware splitter for SQL that contains DO $$ ... $$ blocks,
// CREATE FUNCTION ... AS $$ ... $$ bodies, or $tag$ ... $tag$ strings.
// Also respects single-quoted strings (with '' escape), line comments, and
// /* ... */ block comments.
function splitSqlStatementsSmart(sql) {
  const statements = [];
  let buf = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === '-' && next === '-') {
      while (i < len && sql[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === "'") {
      buf += ch;
      i++;
      while (i < len) {
        const c = sql[i];
        buf += c;
        i++;
        if (c === "'") {
          if (sql[i] === "'") { buf += sql[i]; i++; continue; }
          break;
        }
      }
      continue;
    }
    if (ch === '$') {
      const tagMatch = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        buf += tag;
        i += tag.length;
        const end = sql.indexOf(tag, i);
        if (end === -1) {
          buf += sql.slice(i);
          i = len;
        } else {
          buf += sql.slice(i, end + tag.length);
          i = end + tag.length;
        }
        continue;
      }
    }
    if (ch === ';') {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }

  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
}

// Strict schema name validation — only letters, digits, underscores, length
// 1..63. Same constraints as Postgres' regular identifier rules and matches
// the validation in src/config/database.js.
function validateSchemaName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(name)) {
    throw new Error(`Invalid schema name: ${JSON.stringify(name)}`);
  }
  return name;
}

async function runSqlFile(filePath, client, { smart = false, substitutions = {} } = {}) {
  let sql = await fs.readFile(filePath, 'utf8');
  for (const [token, value] of Object.entries(substitutions)) {
    // Quote-safe: token already includes its own delimiters in the SQL file
    // (e.g. "__SCHEMA__") so we just need a global string replace.
    sql = sql.split(token).join(value);
  }
  const statements = smart
    ? splitSqlStatementsSmart(sql)
    : splitSqlStatements(sql);
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

    // The system-admin RBAC migration is parameterised by schema. On dev
    // startup we substitute the schema chosen via SYSTEM_ADMIN_SCHEMA env
    // (default "public") so the migration is a runnable script. Admins
    // pick a different schema at runtime via the SystemAdminSetup page.
    const systemAdminSchema = validateSchemaName(
      process.env.SYSTEM_ADMIN_SCHEMA || 'public'
    );

    const migrations = [
      { file: path.join(baseDir, 'supabase_bldg_unit_cost_sets.sql'),  smart: false },
      {
        file: path.join(baseDir, 'supabase_system_admin_rbac.sql'),
        smart: true,
        substitutions: { __SCHEMA__: systemAdminSchema },
      },
    ];

    for (const m of migrations) {
      try {
        await runSqlFile(m.file, supabasePrisma, {
          smart: m.smart, substitutions: m.substitutions,
        });
        logger.info(`Startup migration applied: ${path.basename(m.file)}`);
      } catch (err) {
        // Don't let one bad migration stop the others.
        logger.error(`Startup migration failed (${path.basename(m.file)}): ${err.message}`);
      }
    }
  } catch (error) {
    logger.error('Startup migration failed (Supabase).', error);
  }
}

module.exports = {
  runSupabaseStartupMigrations,
  splitSqlStatementsSmart,
  validateSchemaName,
};
