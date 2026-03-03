const { PrismaClient } = require('../src/generated/supabase-client-v5');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.landMarketValue.count();
  console.log(`Total LandMarketValue records: ${count}`);
  
  const muniCount = await prisma.municipality.count();
  console.log(`Total Municipalities: ${muniCount}`);

  const subClassCount = await prisma.landSubClass.count();
  console.log(`Total SubClasses: ${subClassCount}`);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
