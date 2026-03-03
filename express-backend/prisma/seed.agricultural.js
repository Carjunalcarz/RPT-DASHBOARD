const { PrismaClient } = require('../src/generated/supabase-client-v5');

const prisma = new PrismaClient();

const CLASSIFIED_LANDS = [
  { type: 'Riceland, irrigated', values: [345410, 309820, 243880, 211430] },
  { type: 'Riceland, without irrigation', values: [203060, 180030, 157000, 127700] },
  { type: 'Riceland Upland', values: [115140, 92110, 69080, 46050] },
  { type: 'Coconut Land', values: [295680, 253440, 211200, 168960] },
  { type: 'Corn Land', values: [200110, 175100, 150090, 125070] },
  { type: 'Fishpond Traditional (Bangus)', values: [170540, 136430, 102320, 68210] },
  { type: 'Fishpond Extensive (Bangus/Prawn)', values: [201250, 161000, 120750, 80500] },
  { type: 'Abaca land', values: [245400, 187660, 158790, 129920] },
  { type: 'Coffee Land', values: [207270, 175380, 127550, 80000] },
  { type: 'Orchard Land', values: [177080, 153980, 115480, 76990] },
  { type: 'Banana Land', values: [248910, 199130, 149350, 99570] },
  { type: 'Cacao Land', values: [175360, 149060, 113990, 87680] },
  { type: 'Camote Land', values: [119640, 95710, 71790, 69940] },
  { type: 'Rubber Land', values: [229240, 200585, 171930, 143275] },
];

const UNCLASSIFIED_LANDS = [
  { type: 'Nipa Land', value: 116000 },
  { type: 'Bamboo Land', value: 124000 },
  { type: 'Pasture Land', value: 70520 },
  { type: 'Ipil-ipil/Falcata Land', value: 133170 },
];

async function main() {
  console.log('Seeding Land_Agricultural table...');

  // Clean up existing
  await prisma.land_Agricultural.deleteMany({});

  const data = [];
  const ordinanceNo = '716-2024';
  const effectivityDate = new Date('2024-12-03');

  // Classified
  for (const land of CLASSIFIED_LANDS) {
    const levels = ['1st', '2nd', '3rd', '4th'];
    for (let i = 0; i < land.values.length; i++) {
      data.push({
        landType: land.type,
        classLevel: levels[i],
        unitValue: land.values[i],
        ordinanceNo,
        effectivityDate,
      });
    }
  }

  // Unclassified
  for (const land of UNCLASSIFIED_LANDS) {
    data.push({
      landType: land.type,
      classLevel: null, // Unclassified
      unitValue: land.value,
      ordinanceNo,
      effectivityDate,
    });
  }

  console.log(`Inserting ${data.length} agricultural records...`);
  await prisma.land_Agricultural.createMany({
    data,
  });

  console.log('Seeding Completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
