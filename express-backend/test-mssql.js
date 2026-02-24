const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  // database: 'master', // Try connecting to master first to rule out DB issues
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

console.log('Testing connection with config:', {
  ...config,
  password: '****' // Hide password
});

async function testConnection() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected successfully!');
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('SQL Server Version:', result.recordset[0].version);
    await pool.close();
  } catch (err) {
    console.error('Connection failed:', err);
    
    if (err.code === 'ELOGIN') {
      console.log('\nPotential causes for ELOGIN:');
      console.log('1. Incorrect username or password.');
      console.log('2. User "dbuser" does not exist on the server.');
      console.log('3. SQL Server is in "Windows Authentication mode" only (needs "SQL Server and Windows Authentication mode").');
      console.log('4. The account is disabled or locked out.');
    }
  }
}

testConnection();
