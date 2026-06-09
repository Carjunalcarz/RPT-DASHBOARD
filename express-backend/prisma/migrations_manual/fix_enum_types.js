/**
 * Consolidate the duplicated enum types onto the rptas.* copies (which
 * reporting_setup.sql treats as canonical). Three existing columns still use
 * the public.* copies; convert them, recreate the dependent view, then drop
 * the now-unused public duplicates. Atomic.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DB_SCHEMA = process.env.DB_SCHEMA || 'rptas';

(async () => {
  const c = new Client({
    connectionString: process.env.SUPABASE_DIRECT_URL,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 180000,
  });
  await c.connect();

  // 1) Convert the 3 columns from public.* enums to rptas.* enums.
  try {
    await c.query('BEGIN');
    await c.query('DROP VIEW IF EXISTS rptas.v_properties_current');

    const conv = [
      ['rptas.dbo_properties', 'status', 'rptas.property_status', "'active'"],
      ['rptas.property_owner_history', 'change_reason', 'rptas.owner_change_reason', "'new'"],
      ['rptas.property_tdn_history', 'change_reason', 'rptas.tdn_change_reason', "'new'"],
    ];
    for (const [tbl, col, type, def] of conv) {
      await c.query(`ALTER TABLE ${tbl} ALTER COLUMN ${col} DROP DEFAULT`);
      await c.query(`ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE ${type} USING ${col}::text::${type}`);
      await c.query(`ALTER TABLE ${tbl} ALTER COLUMN ${col} SET DEFAULT ${def}`);
      console.log('converted ' + tbl + '.' + col + ' -> ' + type);
    }
    await c.query('COMMIT');
    console.log('=== column conversion COMMITTED ===');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    console.error('=== conversion FAILED (rolled back) ===');
    console.error(e.message);
    await c.end();
    process.exit(1);
  }

  // 2) Re-run reporting_setup.sql to recreate the view + functions consistently.
  const sqlPath = path.join(__dirname, '..', '..', 'src', 'modules', 'rptas', 'database', 'reporting_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/__DB_SCHEMA__/g, DB_SCHEMA);
  try {
    await c.query(sql);
    console.log('=== reporting_setup.sql re-applied OK ===');
  } catch (e) {
    console.error('reporting_setup re-apply FAILED:', e.message);
  }

  // 3) Drop the now-unused public enum duplicates (only if unreferenced).
  for (const t of ['property_status', 'owner_change_reason', 'tdn_change_reason']) {
    try {
      await c.query(`DROP TYPE IF EXISTS public.${t}`);
      console.log('dropped public.' + t);
    } catch (e) {
      console.log('kept public.' + t + ' (still referenced): ' + e.message.split('\n')[0]);
    }
  }

  // 4) Verify
  const cols = (await c.query(`
    SELECT cl.relname tbl, a.attname col, ty_n.nspname||'.'||ty.typname AS type
    FROM pg_attribute a JOIN pg_class cl ON cl.oid=a.attrelid JOIN pg_namespace tn ON tn.oid=cl.relnamespace
    JOIN pg_type ty ON ty.oid=a.atttypid JOIN pg_namespace ty_n ON ty_n.oid=ty.typnamespace
    WHERE tn.nspname='rptas' AND ty.typname IN ('owner_change_reason','tdn_change_reason','property_status')
    ORDER BY 1`)).rows;
  console.log('enum columns now:');
  for (const r of cols) console.log('  rptas.' + r.tbl + '.' + r.col + ' :: ' + r.type);
  await c.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
