const supabase = require('../database/supabase');

async function migrate() {
  try {
    console.log('Starting migration...');

    // Check if table exists
    const { error } = await supabase
      .from('building_types')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST204') { // Table does not exist (PostgREST error code)
      console.log('Tables do not exist. Running migration SQL...');
      
      // Since we can't run raw SQL directly via supabase-js client without a stored procedure or direct connection,
      // and the user asked to "do migration if table not exist",
      // usually this requires the Supabase CLI or the SQL Editor on the dashboard.
      
      // However, if we assume we have a function to run SQL or we instruct the user.
      // But the prompt implies *I* should do it via the API endpoint I created? 
      // Or create a script the user can run.
      
      console.error('CRITICAL: The Supabase JS client cannot execute raw SQL DDL (CREATE TABLE) directly.');
      console.error('Please copy the contents of "src/database/supabase_migration.sql" and run it in your Supabase SQL Editor.');
      
      return { success: false, message: 'Please run SQL manually in Supabase Dashboard' };
    } else if (error) {
       console.error('Error checking tables:', error);
       return { success: false, message: error.message };
    }

    console.log('Tables appear to exist.');
    return { success: true, message: 'Tables already exist' };

  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, message: error.message };
  }
}

if (require.main === module) {
    migrate();
}

module.exports = migrate;