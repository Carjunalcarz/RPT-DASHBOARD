console.log('Starting check...');
try {
  const mssql = require('@prisma/mssql-client');
  console.log('Found mssql client');
} catch (e) {
  console.log('Error requiring mssql:', e.message);
}

try {
  const supabase = require('@prisma/supabase-client');
  console.log('Found supabase client');
} catch (e) {
  console.log('Error requiring supabase:', e.message);
}
console.log('Done checking.');
