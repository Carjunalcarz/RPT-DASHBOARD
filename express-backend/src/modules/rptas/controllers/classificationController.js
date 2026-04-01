const { supabasePrisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

// Get all classifications
exports.getAll = async (req, res) => {
  try {
    const classifications = await supabasePrisma.landClassification.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(classifications);
  } catch (error) {
    logger.error('Error fetching classifications:', error);
    res.status(500).json({ error: 'Failed to fetch classifications' });
  }
};

// Get single classification by Code
exports.getOne = async (req, res) => {
  try {
    const { code } = req.params;
    const classification = await supabasePrisma.landClassification.findUnique({
      where: { code: code }
    });

    if (!classification) {
      return res.status(404).json({ error: 'Classification not found' });
    }

    res.json(classification);
  } catch (error) {
    logger.error(`Error fetching classification ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to fetch classification' });
  }
};

// Get classification with related ActualUses and SubClasses
exports.getFull = async (req, res) => {
  try {
    const { code } = req.params;
    const classification = await supabasePrisma.landClassification.findUnique({
      where: { code: code },
      include: {
        actualUses: true,
        subClasses: true
      }
    });

    if (!classification) {
      return res.status(404).json({ error: 'Classification not found' });
    }

    res.json(classification);
  } catch (error) {
    logger.error(`Error fetching full classification ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to fetch full classification details' });
  }
};

// Create new classification
exports.create = async (req, res) => {
  try {
    const { Code, Description, OrderKey, Grp } = req.body;

    // Check if exists
    const existing = await supabasePrisma.landClassification.findUnique({
      where: { Code }
    });

    if (existing) {
      return res.status(409).json({ error: 'Classification code already exists' });
    }

    const newClassification = await supabasePrisma.landClassification.create({
      data: {
        Code,
        Description,
        OrderKey: OrderKey ? parseInt(OrderKey) : null,
        Grp
      }
    });

    res.status(201).json(newClassification);
  } catch (error) {
    logger.error('Error creating classification:', error);
    res.status(500).json({ error: 'Failed to create classification' });
  }
};

// Update classification
exports.update = async (req, res) => {
  try {
    const { code } = req.params;
    const { Description, OrderKey, Grp } = req.body;

    const updatedClassification = await supabasePrisma.landClassification.update({
      where: { code: code },
      data: {
        Description,
        OrderKey: OrderKey ? parseInt(OrderKey) : undefined,
        Grp
      }
    });

    res.json(updatedClassification);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classification not found' });
    }
    logger.error(`Error updating classification ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to update classification' });
  }
};

// Delete classification
exports.delete = async (req, res) => {
  try {
    const { code } = req.params;

    await supabasePrisma.landClassification.delete({
      where: { code: code }
    });

    res.json({ message: 'Classification deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Classification not found' });
    }
    // Check for foreign key constraint violation (P2003)
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete classification because it is referenced by other records' });
    }
    logger.error(`Error deleting classification ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to delete classification' });
  }
};
