const { supabasePrisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Get all Land Classifications
exports.getClassifications = async (req, res) => {
  try {
    const classifications = await supabasePrisma.landClassification.findMany({
      orderBy: { code: 'asc' }
    });
    
    // Map to frontend expected format if needed, or return as is
    // The frontend currently expects { Code, Description }
    // We can return { code, name, category } and update frontend to use these.
    res.json(classifications);
  } catch (error) {
    logger.error('Error fetching land classifications:', error);
    res.status(500).json({ error: 'Failed to fetch land classifications' });
  }
};

// Get SubClasses by Classification ID or Code
exports.getSubClasses = async (req, res) => {
  try {
    const { classificationCode } = req.query;
    
    const where = {};
    if (classificationCode) {
      // Find the classification first to get ID
      const classification = await supabasePrisma.landClassification.findUnique({
        where: { code: classificationCode }
      });
      
      if (classification) {
        where.classificationId = classification.id;
      } else {
        return res.json([]); // Classification not found
      }
    }

    const subClasses = await supabasePrisma.landSubClass.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        classification: true
      }
    });

    res.json(subClasses);
  } catch (error) {
    logger.error('Error fetching land sub-classes:', error);
    res.status(500).json({ error: 'Failed to fetch land sub-classes' });
  }
};

// Get Market Values (filtered by municipality, subclass, etc.)
exports.getMarketValues = async (req, res) => {
  try {
    const { municipalityName, subClassCode, classificationCode } = req.query;
    
    const where = {};
    
    if (municipalityName) {
      const municipality = await supabasePrisma.municipality.findFirst({
        where: { name: municipalityName }
      });
      if (municipality) {
        where.municipalityId = municipality.id;
      }
    }

    if (subClassCode && classificationCode) {
      if (classificationCode === 'AGR') {
        // Special handling for Agricultural Land
        const whereAgri = {
           landType: subClassCode
        };
        // If classLevel is provided in query (not currently standard but good to support)
        // const { classLevel } = req.query;
        // if (classLevel) whereAgri.classLevel = classLevel;

        const agriValues = await supabasePrisma.land_Agricultural.findMany({
          where: whereAgri,
          orderBy: { classLevel: 'asc' }
        });
        
        // Map to standard format
        return res.json(agriValues.map(v => ({
          id: v.id,
          municipalityId: 0, // Not applicable
          subClassId: 0, // Not applicable
          classLevel: v.classLevel || '1st', // Default for unclassified
          rate: v.unitValue,
          unit: 'HECTARE', // Usually hectare for agri
          ordinanceNo: v.ordinanceNo,
          effectivityDate: v.effectivityDate,
          // Mock relations if needed by frontend
          municipality: { name: 'All' },
          subClass: { code: v.landType, name: v.landType }
        })));
      }

      // Need to find subclass ID first
       const classification = await supabasePrisma.landClassification.findUnique({
        where: { code: classificationCode }
      });
      
      if (classification) {
        const subClass = await supabasePrisma.landSubClass.findUnique({
          where: {
            classificationId_code: {
              classificationId: classification.id,
              code: subClassCode
            }
          }
        });
        if (subClass) {
          where.subClassId = subClass.id;
        }
      }
    }

    const marketValues = await supabasePrisma.landMarketValue.findMany({
      where,
      include: {
        municipality: true,
        subClass: {
          include: {
            classification: true
          }
        }
      },
      orderBy: [
        { municipalityId: 'asc' },
        { subClassId: 'asc' },
        { classLevel: 'asc' }
      ]
    });

    res.json(marketValues);
  } catch (error) {
    logger.error('Error fetching land market values:', error);
    res.status(500).json({ error: 'Failed to fetch land market values' });
  }
};

// Get Municipalities
exports.getMunicipalities = async (req, res) => {
  try {
    const municipalities = await supabasePrisma.municipality.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(municipalities);
  } catch (error) {
    logger.error('Error fetching municipalities:', error);
    res.status(500).json({ error: 'Failed to fetch municipalities' });
  }
};

// Get Agricultural Land Types
exports.getAgriculturalTypes = async (req, res) => {
  try {
    const types = await supabasePrisma.land_Agricultural.findMany({
      distinct: ['landType'],
      select: {
        landType: true
      },
      orderBy: { landType: 'asc' }
    });
    
    // Return as array of strings or objects { code: '...', name: '...' }
    res.json(types.map(t => ({ code: t.landType, name: t.landType })));
  } catch (error) {
    logger.error('Error fetching agricultural types:', error);
    res.status(500).json({ error: 'Failed to fetch agricultural types' });
  }
};
