const { mssqlPrisma } = require('./src/database/prisma');

async function checkData() {
  try {
    console.log('Checking Classifications...');
    const classifications = await mssqlPrisma.classification.findMany({ take: 5 });
    console.log('Classifications:', classifications);

    console.log('\nChecking ActualUses...');
    const actualUses = await mssqlPrisma.actualUse.findMany({ take: 5 });
    console.log('ActualUses:', actualUses);

    console.log('\nChecking SubClasses...');
    const subClasses = await mssqlPrisma.subClass.findMany({ take: 5 });
    console.log('SubClasses:', subClasses);

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await mssqlPrisma.$disconnect();
  }
}

checkData();
