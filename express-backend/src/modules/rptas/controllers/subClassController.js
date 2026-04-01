const { mssqlPrisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

// Get all subclasses
exports.getAll = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass, actualUseCode } = req.query;
    
    const where = {};
    if (region) where.REGION = region;
    if (prov) where.PROV = prov;
    if (city) where.CITY = city;
    
    if (mainClass) where.MainClass = mainClass;

    // If specific code is requested (exact match)
    if (code) {
      where.Code = code;
    } 
    // If filtering by Actual Use parent code (prefix match)
    else if (actualUseCode) {
      where.Code = {
        startsWith: actualUseCode
      };
    }

    const subClasses = await mssqlPrisma.subClass.findMany({
      where,
      orderBy: { Code: 'asc' }
    });
    res.json(subClasses);
  } catch (error) {
    logger.error('Error fetching subclasses:', error);
    res.status(500).json({ error: 'Failed to fetch subclasses' });
  }
};

// Get single subclass by composite key
exports.getOne = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.params;
    
    const subClass = await mssqlPrisma.subClass.findUnique({
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

    if (!subClass) {
      return res.status(404).json({ error: 'SubClass not found' });
    }

    res.json(subClass);
  } catch (error) {
    logger.error('Error fetching subclass:', error);
    res.status(500).json({ error: 'Failed to fetch subclass' });
  }
};

// Create subclass
exports.create = async (req, res) => {
  try {
    const { REGION, PROV, CITY, MainClass, Code, Description } = req.body;

    const newSubClass = await mssqlPrisma.subClass.create({
      data: {
        REGION,
        PROV,
        CITY,
        MainClass,
        Code,
        Description
      }
    });

    res.status(201).json(newSubClass);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'SubClass already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Referenced Classification Code does not exist' });
    }
    logger.error('Error creating subclass:', error);
    res.status(500).json({ error: 'Failed to create subclass' });
  }
};

// Update subclass
exports.update = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.params;
    const { Description } = req.body;

    const updatedSubClass = await mssqlPrisma.subClass.update({
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
        Description
      }
    });

    res.json(updatedSubClass);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'SubClass not found' });
    }
    logger.error('Error updating subclass:', error);
    res.status(500).json({ error: 'Failed to update subclass' });
  }
};

// Delete subclass
exports.delete = async (req, res) => {
  try {
    const { region, prov, city, code, mainClass } = req.params;

    await mssqlPrisma.subClass.delete({
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

    res.json({ message: 'SubClass deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'SubClass not found' });
    }
    logger.error('Error deleting subclass:', error);
    res.status(500).json({ error: 'Failed to delete subclass' });
  }
};
