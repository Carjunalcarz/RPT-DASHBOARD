const { Client } = require('pg');

async function testConnection(dbName) {
  const connectionString = `postgresql://postgres:NVm976VjWEmDVkvJeqR9sTDTzgzaXzgZ@180.232.187.222:5434/${dbName}?sslmode=disable`;
  
  console.log(`\nTesting connection to database: ${dbName}`);
  console.log(`URL: ${connectionString.replace('NVm976VjWEmDVkvJeqR9sTDTzgzaXzgZ', '***')}`);
  
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  
  try {
    await client.connect();
    console.log(`✅ SUCCESS! Connected to ${dbName}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    return false;
  }
}

async function run() {
  const successPostgres = await testConnection('postgres');
  const successAccounting = await testConnection('accounting');
  
  if (!successPostgres && !successAccounting) {
    console.log('\n⚠️ Both connections failed. The password might be wrong, or the database is still not reachable from this machine.');
  }
}

run();