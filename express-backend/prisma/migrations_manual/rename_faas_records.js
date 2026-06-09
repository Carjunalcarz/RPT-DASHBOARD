/**
 * Rename rptas.faas_records -> rptas.dbo_faas_records and repoint the two
 * functions that reference it by name. FKs and triggers follow the table by
 * OID automatically. Atomic: BEGIN/COMMIT, rolls back on any error.
 *
 *   node prisma/migrations_manual/rename_faas_records.js
 */
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const OLD = 'rptas.faas_records';
const NEW = 'rptas.dbo_faas_records';

(async () => {
  const c = new Client({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 120000,
  });
  const notices = [];
  c.on('notice', (n) => notices.push(n.message));
  await c.connect();

  // Pull + transform the two functions that read the table by name.
  const fixDefs = [];
  for (const f of ['sync_faas_to_reporting', 'refresh_reporting_data']) {
    const r = await c.query(
      "SELECT pg_get_functiondef(p.oid) def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1",
      [f],
    );
    if (!r.rows[0]) throw new Error('function not found: ' + f);
    // Replace only the exact `rptas.faas_records` token (word boundary so it
    // never matches the new dbo_faas_records name).
    fixDefs.push(r.rows[0].def.replace(/rptas\.faas_records\b/g, NEW));
  }

  const exists = await c.query("SELECT to_regclass('rptas.faas_records') AS t");
  try {
    await c.query('BEGIN');
    if (exists.rows[0].t) {
      await c.query(`ALTER TABLE ${OLD} RENAME TO dbo_faas_records`);
      console.log('renamed table');
    } else {
      console.log('table already named dbo_faas_records; updating functions only');
    }
    for (const def of fixDefs) await c.query(def);
    await c.query('COMMIT');
    console.log('=== COMMITTED OK ===');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    console.error('=== RENAME FAILED (rolled back) ===');
    console.error(e.message);
    process.exitCode = 1;
  }

  // Verify
  const chk = await c.query(
    "SELECT to_regclass('rptas.dbo_faas_records') AS new_t, to_regclass('rptas.faas_records') AS old_t",
  );
  console.log('rptas.dbo_faas_records:', chk.rows[0].new_t, '| rptas.faas_records:', chk.rows[0].old_t);
  for (const m of notices) console.log('notice:', m);
  await c.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
