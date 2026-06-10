/**
 * Adds the Bank Deposits tables/columns (Cash on Treasury -> Cash in Bank).
 * Reads add_treasury_bank_deposits.sql, substitutes the __DB_SCHEMA__ placeholder
 * with the configured DB_SCHEMA (default 'rptas'), and runs it atomically.
 *
 *   node prisma/migrations_manual/run_add_treasury_bank_deposits.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

(async () => {
  const url = process.env.SUPABASE_DIRECT_URL;
  if (!url) { console.error('SUPABASE_DIRECT_URL not set'); process.exit(1); }

  const schema = process.env.DB_SCHEMA || 'rptas';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    console.error(`Invalid DB_SCHEMA name: ${schema}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(path.join(__dirname, 'add_treasury_bank_deposits.sql'), 'utf8');
  const sql = raw.replace(/__DB_SCHEMA__/g, schema);

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
    console.log(`=== BANK DEPOSITS MIGRATION COMMITTED OK (schema=${schema}) ===`);
  } catch (e) {
    ok = false;
    console.error('=== MIGRATION FAILED (rolled back) ===');
    console.error(e.message);
  } finally {
    if (notices.length) {
      console.log('--- server notices (' + notices.length + ') ---');
      for (const m of notices) console.log('  ' + m);
    }
    await client.end();
  }
  process.exit(ok ? 0 : 1);
})();
