const { supabasePrisma } = require('./src/database/prisma');
const faasService = require('./src/services/faasService');

async function main() {
  const rec = await supabasePrisma.faasRecord.findFirst({
    where: { status: 'approved' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!rec) {
    console.log('No approved FAAS records found.');
    return;
  }
  const rows = await faasService.getTdnHistory(rec.id);
  console.log(JSON.stringify({ faasId: rec.id, rows }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await supabasePrisma.$disconnect();
  });

