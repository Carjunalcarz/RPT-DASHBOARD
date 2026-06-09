/**
 * Drops the empty duplicate rptas.properties, then runs reporting_setup.sql
 * exactly as startup.js would (with __DB_SCHEMA__ -> rptas), to validate the
 * dbo_ renames apply cleanly. Reports the first failing statement, if any.
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
  const notices = [];
  c.on('notice', (n) => notices.push(n.message));
  await c.connect();

  // 1) Drop the empty duplicate created by a prior startup.
  const dupRows = (await c.query("SELECT count(*)::int n FROM rptas.properties")).rows?.[0]?.n ?? null;
  console.log('rptas.properties (duplicate) rows before drop:', dupRows);
  if (dupRows === 0) {
    await c.query('DROP TABLE IF EXISTS rptas.properties CASCADE');
    console.log('dropped empty duplicate rptas.properties');
  } else {
    console.log('SKIP drop: rptas.properties not empty (' + dupRows + ') — investigate');
  }

  // 2) Run reporting_setup.sql the way startup does.
  const sqlPath = path.join(__dirname, '..', '..', 'src', 'modules', 'rptas', 'database', 'reporting_setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/__DB_SCHEMA__/g, DB_SCHEMA);

  try {
    await c.query(sql);
    console.log('=== reporting_setup.sql APPLIED OK ===');
  } catch (e) {
    console.error('=== reporting_setup.sql FAILED ===');
    console.error(e.message);
    if (e.position) {
      const pos = parseInt(e.position, 10);
      console.error('context: ...' + sql.slice(Math.max(0, pos - 120), pos + 60).replace(/\n/g, ' ') + '...');
    }
    process.exitCode = 1;
  }
  for (const m of notices.slice(0, 10)) console.log('notice:', m);
  await c.end();
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
