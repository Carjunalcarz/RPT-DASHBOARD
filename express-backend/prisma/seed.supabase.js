const { PrismaClient } = require('@prisma/supabase-client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase...');
  await prisma.item.create({
    data: {
      name: 'Supabase Seed Item',
      description: 'Seeded into Supabase'
    }
  });
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
