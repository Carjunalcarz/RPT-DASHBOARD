const { supabasePrisma } = require('./src/database/prisma');

async function main() {
  const rows = await supabasePrisma.setupSignatory.findMany({
    where: { deletedAt: null },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  const total = await supabasePrisma.setupSignatory.count({ where: { deletedAt: null } });
  console.log('Total:', total);
  console.log('Sample:', rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await supabasePrisma.$disconnect();
  });
