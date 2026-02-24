const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

async function testSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('AuditLog').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase Error:', error);
    } else {
      console.log('Supabase Connection Successful!');
    }
  } catch (err) {
    console.error('Supabase Connection Failed:', err);
  }
}

testSupabase();
