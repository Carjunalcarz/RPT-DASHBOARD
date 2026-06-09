/**
 * Executes move_rptas_data.sql against the DIRECT (session-mode) connection as
 * a single atomic transaction. The file contains its own BEGIN/COMMIT, so any
 * failure rolls the whole thing back — nothing is partially applied.
 *
 *   node prisma/migrations_manual/run_move_rptas.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

(async () => {
  const url = process.env.SUPABASE_DIRECT_URL;
  if (!url) { console.error('SUPABASE_DIRECT_URL not set'); process.exit(1); }
  const sql = fs.readFileSync(path.join(__dirname, 'move_rptas_data.sql'), 'utf8');

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 180000,
  });
  const notices = [];
  client.on('notice', (n) => notices.push(n.message));

  await client.connect();
  let ok = true;
  try {
    await client.query(sql);
    console.log('=== MIGRATION COMMITTED OK ===');
  } catch (e) {
    ok = false;
    console.error('=== MIGRATION FAILED (rolled back) ===');
    console.error(e.message);
  } finally {
    console.log('--- server notices (' + notices.length + ') ---');
    for (const m of notices) console.log('  ' + m);
    await client.end();
  }
  process.exit(ok ? 0 : 1);
})();
