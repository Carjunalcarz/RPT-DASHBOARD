const { PrismaClient } = require('../src/generated/supabase-client-v5');

const prisma = new PrismaClient();

const MUNICIPALITIES = [
  { code: '01', name: 'Buenavista' },
  { code: '02', name: 'Carmen' },
  { code: '03', name: 'Jabonga' },
  { code: '04', name: 'Kitcharao' },
  { code: '05', name: 'Las Nieves' },
  { code: '06', name: 'Magallanes' },
  { code: '07', name: 'Nasipit' },
  { code: '08', name: 'Santiago' },
  { code: '09', name: 'Tubay' },
  { code: '10', name: 'R.T. Romualdez' },
];

const CLASSIFICATIONS = [
  { code: 'RES', name: 'Residential', category: 'Urban Land' },
  { code: 'COM', name: 'Commercial', category: 'Urban Land' },
  { code: 'IND', name: 'Industrial', category: 'Industrial Land' },
  { code: 'AGR', name: 'Agricultural', category: 'Agricultural Land' },
];

const SUB_CLASSES = [
{ code: 'RES-URB', name: 'Urban Residential', classificationCode: 'RES' },
  { code: 'COM-URB', name: 'Urban Commercial', classificationCode: 'COM' },
  { code: 'IND-URB', name: 'Urban Industrial', classificationCode: 'IND' },
  
  // Specific example requested by user
  { code: 'R-1', name: 'Residential Zone 1', classificationCode: 'RES' },
  { code: 'C-I', name: 'Commercial I', classificationCode: 'COM' }, // Added C-Icode: 'RICELAND-IRR', name: 'Riceland, irrigated', classificationCode: 'AGR' },
  { code: 'RICELAND-NON', name: 'Riceland, without irrigation', classificationCode: 'AGR' },
  { code: 'RICELAND-UP', name: 'Riceland Upland', classificationCode: 'AGR' },
  { code: 'COCO', name: 'Coconut Land', classificationCode: 'AGR' },
  { code: 'CORN', name: 'Corn Land', classificationCode: 'AGR' },
  { code: 'FISH-TRAD', name: 'Fishpond Traditional (Bangus)', classificationCode: 'AGR' },
  { code: 'FISH-EXT', name: 'Fishpond Extensive (Bangus/Prawn)', classificationCode: 'AGR' },
  { code: 'ABACA', name: 'Abaca land', classificationCode: 'AGR' },
  { code: 'COFFEE', name: 'Coffee Land', classificationCode: 'AGR' },
  { code: 'ORCHARD', name: 'Orchard Land', classificationCode: 'AGR' },
  { code: 'BANANA', name: 'Banana Land', classificationCode: 'AGR' },
  { code: 'CACAO', name: 'Cacao Land', classificationCode: 'AGR' },
  { code: 'CAMOTE', name: 'Camote Land', classificationCode: 'AGR' },
  { code: 'RUBBER', name: 'Rubber Land', classificationCode: 'AGR' },
  { code: 'NIPA', name: 'Nipa Land', classificationCode: 'AGR' },
  { code: 'BAMBOO', name: 'Bamboo Land', classificationCode: 'AGR' },
  { code: 'PASTURE', name: 'Pasture Land', classificationCode: 'AGR' },
  { code: 'IPIL', name: 'Ipil-ipil/Falcata Land', classificationCode: 'AGR' },
];

const RESIDENTIAL_VALUES = [
  { muni: 'Buenavista', values: [1770, 1210, 820, 560] },
  { muni: 'Carmen', values: [1260, 990, 740, 550] },
  { muni: 'Jabonga', values: [1320, 1000, 680, 350] },
  { muni: 'Kitcharao', values: [1500, 1000, 720, 470] },
  { muni: 'Las Nieves', values: [1080, 730, 520, 350] },
  { muni: 'Magallanes', values: [1070, 800, 600, 440] },
  { muni: 'Nasipit', values: [1540, 1140, 800, 520] },
  { muni: 'Santiago', values: [1180, 930, 800, 600] },
  { muni: 'Tubay', values: [960, 680, 480, 290] },
  { muni: 'R.T. Romualdez', values: [1000, 680, 460, 280] },
];

const COMMERCIAL_VALUES = [
  { muni: 'Buenavista', values: [2840, 2230, 1740, 1360] },
  { muni: 'Carmen', values: [1980, 1540, 1220, 820] },
  { muni: 'Jabonga', values: [1780, 1330, 920, 570] },
  { muni: 'Kitcharao', values: [2170, 1700, 1400, 1150] },
  { muni: 'Las Nieves', values: [1760, 1380, 1140, 890] },
  { muni: 'Magallanes', values: [2070, 1710, 1400, 1100] },
  { muni: 'Nasipit', values: [2640, 2070, 1630, 1210] },
  { muni: 'Santiago', values: [2460, 2020, 1580, 1180] },
  { muni: 'Tubay', values: [1350, 910, 630, 330] },
  { muni: 'R.T. Romualdez', values: [1260, 1090, 860, 580] },
];

const INDUSTRIAL_VALUES = [
  { muni: 'Buenavista', values: [3320, 2230, 1540, 1000] },
  { muni: 'Carmen', values: [2270, 2120, 1830, 1390] },
  { muni: 'Jabonga', values: [2480, 2000, 1380, 840] },
  { muni: 'Kitcharao', values: [2920, 2380, 2030, 1490] },
  { muni: 'Las Nieves', values: [2510, 1950, 1580, 1340] },
  { muni: 'Magallanes', values: [2700, 2200, 2030, 1730] },
  { muni: 'Nasipit', values: [3560, 2160, 1370, 830] },
  { muni: 'Santiago', values: [2160, 1770, 1390, 960] },
  { muni: 'Tubay', values: [1490, 1100, 830, 430] },
  { muni: 'R.T. Romualdez', values: [2110, 1630, 1380, 870] },
];

const AGRICULTURAL_VALUES = [
  { code: 'RICELAND-IRR', values: [345410, 309820, 243880, 211430] },
  { code: 'RICELAND-NON', values: [203060, 180030, 157000, 127700] },
  { code: 'RICELAND-UP', values: [115140, 92110, 69080, 46050] },
  { code: 'COCO', values: [295680, 253440, 211200, 168960] },
  { code: 'CORN', values: [200110, 175100, 150090, 125070] },
  { code: 'FISH-TRAD', values: [170540, 136430, 102320, 68210] },
  { code: 'FISH-EXT', values: [201250, 161000, 120750, 80500] },
  { code: 'ABACA', values: [245400, 187660, 158790, 129920] },
  { code: 'COFFEE', values: [207270, 175380, 127550, 80000] },
  { code: 'ORCHARD', values: [177080, 153980, 115480, 76990] },
  { code: 'BANANA', values: [248910, 199130, 149350, 99570] },
  { code: 'CACAO', values: [175360, 149060, 113990, 87680] },
  { code: 'CAMOTE', values: [119640, 95710, 71790, 69940] },
  { code: 'RUBBER', values: [229240, 200585, 171930, 143275] },
];

const UNCLASSIFIED_AGRI_VALUES = [
  { code: 'NIPA', value: 116000 },
  { code: 'BAMBOO', value: 124000 },
  { code: 'PASTURE', value: 70520 },
  { code: 'IPIL', value: 133170 },
];

async function main() {
  console.log('Seeding Normalized Urban & Agri Land Values (Optimized)...');

  // 0. Clean up existing data to avoid duplicates
  console.log('Cleaning up existing LandMarketValue records...');
  await prisma.landMarketValue.deleteMany({});

  // 1. Seed Municipalities
  console.log('Seeding Municipalities...');
  const muniMap = new Map();
  for (const muni of MUNICIPALITIES) {
    const record = await prisma.municipality.upsert({
      where: { code: muni.code },
      update: { name: muni.name },
      create: { code: muni.code, name: muni.name },
    });
    muniMap.set(muni.name, record.id);
  }

  // 2. Seed Classifications
  console.log('Seeding Classifications...');
  const classMap = new Map();
  for (const cls of CLASSIFICATIONS) {
    const record = await prisma.landClassification.upsert({
      where: { code: cls.code },
      update: { name: cls.name, category: cls.category },
      create: { code: cls.code, name: cls.name, category: cls.category },
    });
    classMap.set(cls.code, record.id);
  }

  // 3. Seed SubClasses
  console.log('Seeding SubClasses...');
  const subClassMap = new Map();
  for (const sub of SUB_CLASSES) {
    const record = await prisma.landSubClass.upsert({
      where: { 
        classificationId_code: {
          classificationId: classMap.get(sub.classificationCode),
          code: sub.code
        }
      },
      update: { name: sub.name },
      create: { 
        classificationId: classMap.get(sub.classificationCode),
        code: sub.code,
        name: sub.name
      },
    });
    subClassMap.set(sub.code, record.id);
  }

  // Helper to prepare data for createMany
  const prepareData = (subClassCode, valuesData, unit = 'SQM') => {
    const subClassId = subClassMap.get(subClassCode);
    if (!subClassId) {
      console.error(`SubClass not found: ${subClassCode}`);
      return [];
    }

    const data = [];
    for (const item of valuesData) {
      const muniId = muniMap.get(item.muni);
      if (!muniId) continue;

      const levels = ['1st', '2nd', '3rd', '4th'];
      for (let i = 0; i < item.values.length; i++) {
        data.push({
          municipalityId: muniId,
          subClassId: subClassId,
          classLevel: levels[i],
          rate: item.values[i],
          unit: unit,
          ordinanceNo: '716-2024',
          effectivityDate: new Date('2024-12-03'),
        });
      }
    }
    return data;
  };

  // 4. Seed Market Values using createMany
  console.log('Seeding Market Values...');
  let allMarketValues = [];

  allMarketValues.push(...prepareData('RES-URB', RESIDENTIAL_VALUES));
  allMarketValues.push(...prepareData('COM-URB', COMMERCIAL_VALUES));
  allMarketValues.push(...prepareData('IND-URB', INDUSTRIAL_VALUES));

  // Seed "R-1" Example
  const r1SubClassId = subClassMap.get('R-1');
  const buenavistaId = muniMap.get('Buenavista');
  if (r1SubClassId && buenavistaId) {
    allMarketValues.push({
      municipalityId: buenavistaId,
      subClassId: r1SubClassId,
      classLevel: '1st',
      rate: 1770.00,
      unit: 'SQM',
      ordinanceNo: '716-2024',
      effectivityDate: new Date('2024-12-03'),
    });
  }

  // Seed "C-I" Example (Commercial 1st Class for Buenavista)
  // Request: C-I for commercial 1st remove the class lavel (assuming it implies using the 1st class value for C-I)
  const c1SubClassId = subClassMap.get('C-I');
  if (c1SubClassId && buenavistaId) {
    allMarketValues.push({
      municipalityId: buenavistaId,
      subClassId: c1SubClassId,
      classLevel: '1st',
      rate: 2840.00, // Using Buenavista Commercial 1st Class Value
      unit: 'SQM',
      ordinanceNo: '716-2024',
      effectivityDate: new Date('2024-12-03'),
    });
  }

  // 5. Seed Agricultural Values (Province-wide)
  const allMuniIds = Array.from(muniMap.values());
  
  for (const agriItem of AGRICULTURAL_VALUES) {
    const subClassId = subClassMap.get(agriItem.code);
    if (!subClassId) continue;

    for (const muniId of allMuniIds) {
      const levels = ['1st', '2nd', '3rd', '4th'];
      for (let i = 0; i < agriItem.values.length; i++) {
        allMarketValues.push({
          municipalityId: muniId,
          subClassId: subClassId,
          classLevel: levels[i],
          rate: agriItem.values[i],
          unit: 'HECTARE',
          ordinanceNo: '716-2024',
          effectivityDate: new Date('2024-12-03'),
        });
      }
    }
  }

  // Seed Unclassified Agri
  for (const agriItem of UNCLASSIFIED_AGRI_VALUES) {
    const subClassId = subClassMap.get(agriItem.code);
    if (!subClassId) continue;

    for (const muniId of allMuniIds) {
      allMarketValues.push({
        municipalityId: muniId,
        subClassId: subClassId,
        classLevel: '1st', 
        rate: agriItem.value,
        unit: 'HECTARE',
        ordinanceNo: '716-2024',
        effectivityDate: new Date('2024-12-03'),
      });
    }
  }

  // Batch insert to avoid huge payload if necessary, but 700 records is fine for one batch
  console.log(`Inserting ${allMarketValues.length} records...`);
  await prisma.landMarketValue.createMany({
    data: allMarketValues,
    skipDuplicates: true, // Just in case
  });

  console.log('Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
