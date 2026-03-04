const { PrismaClient } = require('../src/generated/supabase-client-v5');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase...');
  
  try {
    // 1. Seed initial item
    await prisma.item.create({
      data: {
        name: 'Supabase Seed Item',
        description: 'Seeded into Supabase'
      }
    });
    console.log('Created initial seed item');

    // 2. Execute SQL migration/seed file
    const sqlPath = path.join(__dirname, '../src/database/supabase_migration.sql');
    console.log(`Reading SQL seed file from: ${sqlPath}`);
    
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
      console.log('Executing SQL seed script...');
      
      // Split the SQL content by semicolon to handle multiple statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      console.log(`Found ${statements.length} SQL statements to execute.`);

      for (const statement of statements) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (stmtError) {
          console.error('Error executing statement:', statement.substring(0, 50) + '...');
          throw stmtError;
        }
      }
      
      console.log('Successfully executed SQL seed script');
    } else {
      console.warn(`SQL seed file not found at ${sqlPath}`);
    }

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }

  console.log('Supabase Seeding Completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
