const { PrismaClient } = require('../src/generated/supabase-client-v5');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Ordinance Data...');

  // 1. Building Types
  const buildingTypes = [
    { code: 'RES', name: 'RESIDENTIAL BUILDING: ONE FAMILY DWELLING, SINGLE DETACHED, DUPLEX' },
    { code: 'ACC', name: 'ACCESSORY: QUARTER, LAUNDRY, GUARD HOUSE, ANNEX, POWER HOUSE, RESTROOM' },
    { code: 'APT', name: 'APARTMENT: BOARDING HOUSE, LODGING HOUSE, PENSION HOUSE, TOWN HOUSE, APARTEL, FUNERAL PARLOR, DORMITORY' },
    { code: 'COM', name: 'COMMERCIAL: RESTAURANT, SHOPPING CENTER & MARKET' },
    { code: 'THE', name: 'THEATERS, ASSEMBLY HOUSE, CONVENTION' },
    { code: 'HOT', name: 'HOTEL, MOTEL, RESTAURANT, RESTO BAR, CLUB HOUSE, BANK, PHARMACY, STORE, BUILDING, PRESS' },
    { code: 'IND', name: 'FACTORY, WAREHOUSE, BODEGA' },
    { code: 'SCH', name: 'SCHOOL BUILDING, GOVERNMENT BUILDING, LIBRARY' },
    { code: 'GYM', name: 'GYMNASIUM, COLISEUM' }
  ];

  for (const type of buildingTypes) {
    await prisma.buildingType.upsert({
      where: { code: type.code },
      update: { name: type.name },
      create: type,
    });
  }

  console.log('Building Types seeded.');

  // Helper to get ID
  const getTypeId = async (code) => {
    const type = await prisma.buildingType.findUnique({ where: { code } });
    return type.id;
  };

  const ORDINANCE_NO = '6th GR SP 2025';
  const EFFECTIVITY_DATE = new Date('2025-01-01');

  // Clear existing values for this ordinance to avoid duplicates if re-running
  // (Optional, but good for idempotency if we don't have unique constraints on all fields)
  // await prisma.buildingMarketValue.deleteMany({ where: { ordinanceNo: ORDINANCE_NO } });

  const marketValues = [];

  // RESIDENTIAL
  const resId = await getTypeId('RES');
  marketValues.push(
    { buildingTypeId: resId, structureClass: 'V', subClass: 'A', unitValue: 10890.00 },
    { buildingTypeId: resId, structureClass: 'V', subClass: 'B', unitValue: 10350.00 },
    { buildingTypeId: resId, structureClass: 'IV', subClass: 'A', unitValue: 7990.00 },
    { buildingTypeId: resId, structureClass: 'IV', subClass: 'B', unitValue: 7590.00 },
    { buildingTypeId: resId, structureClass: 'III', subClass: 'A', unitValue: 6800.00 },
    { buildingTypeId: resId, structureClass: 'III', subClass: 'B', unitValue: 6460.00 },
    { buildingTypeId: resId, structureClass: 'III', subClass: 'C', unitValue: 6140.00 },
    { buildingTypeId: resId, structureClass: 'II', subClass: 'A', unitValue: 5830.00 },
    { buildingTypeId: resId, structureClass: 'II', subClass: 'B', unitValue: 5540.00 },
    { buildingTypeId: resId, structureClass: 'I', subClass: 'A', unitValue: 4810.00 },
    { buildingTypeId: resId, structureClass: 'I', subClass: 'B', unitValue: 4570.00 }
  );

  // ACCESSORY
  const accId = await getTypeId('ACC');
  marketValues.push(
    { buildingTypeId: accId, structureClass: 'V', subClass: 'A', unitValue: 7680.00 },
    { buildingTypeId: accId, structureClass: 'V', subClass: 'B', unitValue: 7280.00 },
    { buildingTypeId: accId, structureClass: 'IV', subClass: 'A', unitValue: 6380.00 },
    { buildingTypeId: accId, structureClass: 'IV', subClass: 'B', unitValue: 5460.00 },
    { buildingTypeId: accId, structureClass: 'III', subClass: 'A', unitValue: 4010.00 },
    { buildingTypeId: accId, structureClass: 'III', subClass: 'B', unitValue: 3820.00 },
    { buildingTypeId: accId, structureClass: 'III', subClass: 'C', unitValue: 3430.00 },
    { buildingTypeId: accId, structureClass: 'II', subClass: 'A', unitValue: 3340.00 },
    { buildingTypeId: accId, structureClass: 'II', subClass: 'B', unitValue: 3150.00 },
    { buildingTypeId: accId, structureClass: 'I', subClass: 'A', unitValue: 2880.00 }
  );

  // APARTMENT
  const aptId = await getTypeId('APT');
  marketValues.push(
    { buildingTypeId: aptId, structureClass: 'V', subClass: 'A', unitValue: 8450.00 },
    { buildingTypeId: aptId, structureClass: 'V', subClass: 'B', unitValue: 7800.00 },
    { buildingTypeId: aptId, structureClass: 'IV', subClass: 'A', unitValue: 5980.00 },
    { buildingTypeId: aptId, structureClass: 'IV', subClass: 'B', unitValue: 5070.00 },
    { buildingTypeId: aptId, structureClass: 'III', subClass: 'A', unitValue: 4200.00 },
    { buildingTypeId: aptId, structureClass: 'III', subClass: 'B', unitValue: 3920.00 },
    { buildingTypeId: aptId, structureClass: 'III', subClass: 'C', unitValue: 3820.00 },
    { buildingTypeId: aptId, structureClass: 'II', subClass: 'A', unitValue: 3540.00 },
    { buildingTypeId: aptId, structureClass: 'II', subClass: 'B', unitValue: 3350.00 },
    { buildingTypeId: aptId, structureClass: 'I', subClass: 'A', unitValue: 3080.00 }
  );

  // COMMERCIAL
  const comId = await getTypeId('COM');
  marketValues.push(
    { buildingTypeId: comId, structureClass: 'V', subClass: 'A', unitValue: 7230.00 },
    { buildingTypeId: comId, structureClass: 'V', subClass: 'B', unitValue: 6720.00 },
    { buildingTypeId: comId, structureClass: 'IV', subClass: 'A', unitValue: 6100.00 },
    { buildingTypeId: comId, structureClass: 'IV', subClass: 'B', unitValue: 5200.00 },
    { buildingTypeId: comId, structureClass: 'III', subClass: 'A', unitValue: 4810.00 },
    { buildingTypeId: comId, structureClass: 'III', subClass: 'B', unitValue: 4290.00 },
    { buildingTypeId: comId, structureClass: 'II', subClass: 'A', unitValue: 4040.00 },
    { buildingTypeId: comId, structureClass: 'II', subClass: 'B', unitValue: 3820.00 },
    { buildingTypeId: comId, structureClass: 'I', subClass: 'A', unitValue: 3510.00 }
  );

  // THEATERS
  const theId = await getTypeId('THE');
  marketValues.push(
    { buildingTypeId: theId, structureClass: 'V', subClass: 'A', unitValue: 10430.00 },
    { buildingTypeId: theId, structureClass: 'V', subClass: 'B', unitValue: 10220.00 },
    { buildingTypeId: theId, structureClass: 'IV', subClass: 'A', unitValue: 9910.00 },
    { buildingTypeId: theId, structureClass: 'IV', subClass: 'B', unitValue: 9480.00 },
    { buildingTypeId: theId, structureClass: 'III', subClass: 'A', unitValue: 8450.00 },
    { buildingTypeId: theId, structureClass: 'III', subClass: 'B', unitValue: 7020.00 },
    { buildingTypeId: theId, structureClass: 'II', subClass: 'A', unitValue: 5460.00 },
    { buildingTypeId: theId, structureClass: 'II', subClass: 'B', unitValue: 5300.00 },
    { buildingTypeId: theId, structureClass: 'I', subClass: 'A', unitValue: 4850.00 }
  );

  // HOTEL
  const hotId = await getTypeId('HOT');
  marketValues.push(
    { buildingTypeId: hotId, structureClass: 'V', subClass: 'A', unitValue: 10000.00 },
    { buildingTypeId: hotId, structureClass: 'V', subClass: 'B', unitValue: 9200.00 },
    { buildingTypeId: hotId, structureClass: 'IV', subClass: 'A', unitValue: 8920.00 },
    { buildingTypeId: hotId, structureClass: 'IV', subClass: 'B', unitValue: 7840.00 },
    { buildingTypeId: hotId, structureClass: 'III', subClass: 'A', unitValue: 6900.00 },
    { buildingTypeId: hotId, structureClass: 'III', subClass: 'B', unitValue: 5660.00 },
    { buildingTypeId: hotId, structureClass: 'II', subClass: 'A', unitValue: 5120.00 },
    { buildingTypeId: hotId, structureClass: 'II', subClass: 'B', unitValue: 4970.00 },
    { buildingTypeId: hotId, structureClass: 'I', subClass: 'A', unitValue: 4470.00 }
  );

  // INDUSTRIAL
  const indId = await getTypeId('IND');
  marketValues.push(
    { buildingTypeId: indId, structureClass: 'V', subClass: 'A', unitValue: 7500.00 },
    { buildingTypeId: indId, structureClass: 'V', subClass: 'B', unitValue: 5430.00 },
    { buildingTypeId: indId, structureClass: 'IV', subClass: 'A', unitValue: 5270.00 },
    { buildingTypeId: indId, structureClass: 'IV', subClass: 'B', unitValue: 4290.00 },
    { buildingTypeId: indId, structureClass: 'III', subClass: 'A', unitValue: 3840.00 },
    { buildingTypeId: indId, structureClass: 'III', subClass: 'B', unitValue: 3020.00 },
    { buildingTypeId: indId, structureClass: 'II', subClass: 'A', unitValue: 2830.00 },
    { buildingTypeId: indId, structureClass: 'II', subClass: 'B', unitValue: 2750.00 },
    { buildingTypeId: indId, structureClass: 'I', subClass: 'A', unitValue: 2730.00 },
    { buildingTypeId: indId, structureClass: 'I', subClass: 'B', unitValue: 2630.00 }
  );

  // SCHOOL
  const schId = await getTypeId('SCH');
  marketValues.push(
    { buildingTypeId: schId, structureClass: 'V', subClass: 'A', unitValue: 8710.00 },
    { buildingTypeId: schId, structureClass: 'V', subClass: 'B', unitValue: 7700.00 },
    { buildingTypeId: schId, structureClass: 'IV', subClass: 'A', unitValue: 7470.00 },
    { buildingTypeId: schId, structureClass: 'IV', subClass: 'B', unitValue: 6380.00 },
    { buildingTypeId: schId, structureClass: 'III', subClass: 'A', unitValue: 6190.00 },
    { buildingTypeId: schId, structureClass: 'III', subClass: 'B', unitValue: 5460.00 },
    { buildingTypeId: schId, structureClass: 'II', subClass: 'A', unitValue: 4850.00 },
    { buildingTypeId: schId, structureClass: 'II', subClass: 'B', unitValue: 4540.00 }
  );

  // GYMNASIUM
  const gymId = await getTypeId('GYM');
  marketValues.push(
    { buildingTypeId: gymId, structureClass: 'V', subClass: 'A', unitValue: 9130.00 },
    { buildingTypeId: gymId, structureClass: 'V', subClass: 'B', unitValue: 8320.00 },
    { buildingTypeId: gymId, structureClass: 'IV', subClass: 'A', unitValue: 8070.00 },
    { buildingTypeId: gymId, structureClass: 'IV', subClass: 'B', unitValue: 6970.00 },
    { buildingTypeId: gymId, structureClass: 'III', subClass: 'A', unitValue: 5770.00 },
    { buildingTypeId: gymId, structureClass: 'III', subClass: 'B', unitValue: 5120.00 },
    { buildingTypeId: gymId, structureClass: 'II', subClass: 'A', unitValue: 4290.00 },
    { buildingTypeId: gymId, structureClass: 'II', subClass: 'B', unitValue: 4160.00 },
    { buildingTypeId: gymId, structureClass: 'I', subClass: 'A', unitValue: 3210.00 },
    { buildingTypeId: gymId, structureClass: 'I', subClass: 'B', unitValue: 2910.00 }
  );

  console.log(`Seeding ${marketValues.length} market values...`);

  for (const mv of marketValues) {
    // Check if exists to avoid duplicates or use createMany if empty
    // Using simple create loop for now
    await prisma.buildingMarketValue.create({
      data: {
        ordinanceNo: ORDINANCE_NO,
        effectivityDate: EFFECTIVITY_DATE,
        ...mv
      }
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });