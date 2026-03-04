const { PrismaClient } = require('../src/generated/mssql-client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MSSQL...');
  await prisma.item.create({
    data: {
      name: 'MSSQL Seed Item',
      description: 'Seeded into MSSQL'
    }
  });
  console.log('MSSQL Seeding Completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
