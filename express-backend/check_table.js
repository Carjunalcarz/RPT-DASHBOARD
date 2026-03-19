const { supabasePrisma } = require('./src/database/prisma');

async function checkTable() {
  try {
    const result = await supabasePrisma.$queryRaw`SELECT to_regclass('public.setup_signatory_templates')::text;`;
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

checkTable();
