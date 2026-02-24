require('dotenv').config();

console.log('Current Environment Configuration:');
console.log('MSSQL_USER:', process.env.MSSQL_USER);
console.log('MSSQL_PASSWORD:', process.env.MSSQL_PASSWORD ? '****' : 'MISSING');
console.log('MSSQL_SERVER:', process.env.MSSQL_SERVER);
console.log('MSSQL_DATABASE:', process.env.MSSQL_DATABASE);
console.log('MSSQL_PORT:', process.env.MSSQL_PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
