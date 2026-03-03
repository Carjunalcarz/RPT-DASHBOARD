const { mssqlPrisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Get all actual uses
exports.getAll = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.query;
    
    const where = {};
    if (region) where.REGION = region;
    if (prov) where.PROV = prov;
    if (city) where.CITY = city;
    if (code) where.Code = code;
    if (mainClass) where.MainClass = mainClass;

    const actualUses = await mssqlPrisma.actualUse.findMany({
      where,
      orderBy: { MainClass: 'asc' }
    });
    res.json(actualUses);
  } catch (error) {
    logger.error('Error fetching actual uses:', error);
    res.status(500).json({ error: 'Failed to fetch actual uses' });
  }
};

// Get single actual use by composite key
exports.getOne = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.params;
    
    const actualUse = await mssqlPrisma.actualUse.findUnique({
      where: {
        compositeId: {
          REGION: region,
          PROV: prov,
          CITY: city,
          Code: code,
          MainClass: mainClass
        }
      }
    });

    if (!actualUse) {
      return res.status(404).json({ error: 'Actual Use not found' });
    }

    res.json(actualUse);
  } catch (error) {
    logger.error('Error fetching actual use:', error);
    res.status(500).json({ error: 'Failed to fetch actual use' });
  }
};

// Create actual use
exports.create = async (req, res) => {
  try {
    const { REGION, PROV, CITY, MainClass, Code, Description, MValue, ForSelection, Grp } = req.body;

    const newActualUse = await mssqlPrisma.actualUse.create({
      data: {
        REGION,
        PROV,
        CITY,
        MainClass,
        Code,
        Description,
        MValue: MValue ? parseFloat(MValue) : null,
        ForSelection: ForSelection ? parseInt(ForSelection) : null,
        Grp
      }
    });

    res.status(201).json(newActualUse);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Actual Use already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Referenced Classification Code does not exist' });
    }
    logger.error('Error creating actual use:', error);
    res.status(500).json({ error: 'Failed to create actual use' });
  }
};

// Update actual use
exports.update = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.params;
    const { Description, MValue, ForSelection, Grp } = req.body;

    const updatedActualUse = await mssqlPrisma.actualUse.update({
      where: {
        compositeId: {
          REGION: region,
          PROV: prov,
          CITY: city,
          Code: code,
          MainClass: mainClass
        }
      },
      data: {
        Description,
        MValue: MValue !== undefined ? parseFloat(MValue) : undefined,
        ForSelection: ForSelection !== undefined ? parseInt(ForSelection) : undefined,
        Grp
      }
    });

    res.json(updatedActualUse);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Actual Use not found' });
    }
    logger.error('Error updating actual use:', error);
    res.status(500).json({ error: 'Failed to update actual use' });
  }
};

// Delete actual use
exports.delete = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.params;

    await mssqlPrisma.actualUse.delete({
      where: {
        compositeId: {
          REGION: region,
          PROV: prov,
          CITY: city,
          Code: code,
          MainClass: mainClass
        }
      }
    });

    res.json({ message: 'Actual Use deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Actual Use not found' });
    }
    logger.error('Error deleting actual use:', error);
    res.status(500).json({ error: 'Failed to delete actual use' });
  }
};
