const { PrismaClient } = require('../src/generated/supabase-client-v5');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Land Market Values (Legacy/Simple)...');

  // Agricultural Lands (For all 10 municipalities)
  const agriculturalValues = [
    { subClass: 'Riceland, irrigated', values: [345410, 309820, 243880, 211430] },
    { subClass: 'Riceland, without irrigation', values: [203060, 180030, 157000, 127700] },
    { subClass: 'Riceland Upland', values: [115140, 92110, 69080, 46050] },
    { subClass: 'Coconut Land', values: [295680, 253440, 211200, 168960] },
    { subClass: 'Corn Land', values: [200110, 175100, 150090, 125070] },
    { subClass: 'Fishpond Traditional (Bangus)', values: [170540, 136430, 102320, 68210] },
    { subClass: 'Fishpond Extensive (Bangus/Prawn)', values: [201250, 161000, 120750, 80500] },
    { subClass: 'Abaca land', values: [245400, 187660, 158790, 129920] },
    { subClass: 'Coffee Land', values: [207270, 175380, 127550, 80000] },
    { subClass: 'Orchard Land', values: [177080, 153980, 115480, 76990] },
    { subClass: 'Banana Land', values: [248910, 199130, 149350, 99570] },
    { subClass: 'Cacao Land', values: [175360, 149060, 113990, 87680] },
    { subClass: 'Camote Land', values: [119640, 95710, 71790, 69940] },
    { subClass: 'Rubber Land', values: [229240, 200585, 171930, 143275] },
  ];

  const unclassifiedAgriValues = [
    { subClass: 'Nipa Land', first: 116000 },
    { subClass: 'Bamboo Land', first: 124000 },
    { subClass: 'Pasture Land', first: 70520 },
    { subClass: 'Ipil-ipil/Falcata Land', first: 133170 },
  ];

  // Insert Agricultural
  for (const item of agriculturalValues) {
    await prisma.simpleLandMarketValue.create({
      data: {
        municipality: 'ALL',
        classification: 'Agricultural',
        subClass: item.subClass,
        firstClass: item.values[0],
        secondClass: item.values[1],
        thirdClass: item.values[2],
        fourthClass: item.values[3],
        unit: 'HECTARE', // Inferred from values
      }
    });
  }

  for (const item of unclassifiedAgriValues) {
    await prisma.simpleLandMarketValue.create({
      data: {
        municipality: 'ALL',
        classification: 'Agricultural',
        subClass: item.subClass,
        firstClass: item.first,
        unit: 'HECTARE',
      }
    });
  }

  // Industrial
  const industrialValues = [
    { municipality: 'Buenavista', values: [3320, 2230, 1540, 1000] },
    { municipality: 'Carmen', values: [2270, 2120, 1830, 1390] },
    { municipality: 'Jabonga', values: [2480, 2000, 1380, 840] },
    { municipality: 'Kitcharao', values: [2920, 2380, 2030, 1490] },
    { municipality: 'Las Nieves', values: [2510, 1950, 1580, 1340] },
    { municipality: 'Magallanes', values: [2700, 2200, 2030, 1730] },
    { municipality: 'Nasipit', values: [3560, 2160, 1370, 830] },
    { municipality: 'Santiago', values: [2160, 1770, 1390, 960] },
    { municipality: 'Tubay', values: [1490, 1100, 830, 430] },
    { municipality: 'R.T. Romualdez', values: [2110, 1630, 1380, 870] },
  ];

  for (const item of industrialValues) {
    await prisma.simpleLandMarketValue.create({
      data: {
        municipality: item.municipality,
        classification: 'Industrial',
        firstClass: item.values[0],
        secondClass: item.values[1],
        thirdClass: item.values[2],
        fourthClass: item.values[3],
        unit: 'SQM',
      }
    });
  }

  // Residential
  const residentialValues = [
    { municipality: 'Buenavista', values: [1770, 1210, 820, 560] },
    { municipality: 'Carmen', values: [1260, 990, 740, 550] },
    { municipality: 'Jabonga', values: [1320, 1000, 680, 350] },
    { municipality: 'Kitcharao', values: [1500, 1000, 720, 470] },
    { municipality: 'Las Nieves', values: [1080, 730, 520, 350] },
    { municipality: 'Magallanes', values: [1070, 800, 600, 440] },
    { municipality: 'Nasipit', values: [1540, 1140, 800, 520] },
    { municipality: 'Santiago', values: [1180, 930, 800, 600] },
    { municipality: 'Tubay', values: [960, 680, 480, 290] },
    { municipality: 'R.T. Romualdez', values: [1000, 680, 460, 280] },
  ];

  for (const item of residentialValues) {
    await prisma.simpleLandMarketValue.create({
      data: {
        municipality: item.municipality,
        classification: 'Residential',
        firstClass: item.values[0],
        secondClass: item.values[1],
        thirdClass: item.values[2],
        fourthClass: item.values[3],
        unit: 'SQM',
      }
    });
  }

  // Commercial
  const commercialValues = [
    { municipality: 'Buenavista', values: [2840, 2230, 1740, 1360] },
    { municipality: 'Carmen', values: [1980, 1540, 1220, 820] },
    { municipality: 'Jabonga', values: [1780, 1330, 920, 570] },
    { municipality: 'Kitcharao', values: [2170, 1700, 1400, 1150] },
    { municipality: 'Las Nieves', values: [1760, 1380, 1140, 890] },
    { municipality: 'Magallanes', values: [2070, 1710, 1400, 1100] },
    { municipality: 'Nasipit', values: [2640, 2070, 1630, 1210] },
    { municipality: 'Santiago', values: [2460, 2020, 1580, 1180] },
    { municipality: 'Tubay', values: [1350, 910, 630, 330] },
    { municipality: 'R.T. Romualdez', values: [1260, 1090, 860, 580] },
  ];

  for (const item of commercialValues) {
    await prisma.simpleLandMarketValue.create({
      data: {
        municipality: item.municipality,
        classification: 'Commercial',
        firstClass: item.values[0],
        secondClass: item.values[1],
        thirdClass: item.values[2],
        fourthClass: item.values[3],
        unit: 'SQM',
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
