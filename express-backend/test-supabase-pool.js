const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function testPool() {
  try {
    const client = await pool.connect();
    console.log('Connected to Supabase Pool!');
    const res = await client.query('SELECT NOW()');
    console.log('Current Time:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Supabase Pool Connection Failed:', err);
  } finally {
    await pool.end();
  }
}

testPool();
