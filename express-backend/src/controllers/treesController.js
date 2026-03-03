const { mssqlPrisma } = require('../database/prisma');
const logger = require('../utils/logger');

// Get all trees
exports.getAll = async (req, res) => {
  try {
    const trees = await mssqlPrisma.trees.findMany({
      orderBy: { Description: 'asc' }
    });
    res.json(trees);
  } catch (error) {
    logger.error('Error fetching trees:', error);
    res.status(500).json({ error: 'Failed to fetch trees' });
  }
};

// Get single tree by Code
exports.getOne = async (req, res) => {
  try {
    const { code } = req.params;
    const tree = await mssqlPrisma.trees.findUnique({
      where: { Code: code }
    });

    if (!tree) {
      return res.status(404).json({ error: 'Tree not found' });
    }

    res.json(tree);
  } catch (error) {
    logger.error(`Error fetching tree ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to fetch tree' });
  }
};

// Create new tree
exports.create = async (req, res) => {
  try {
    const { Code, Description } = req.body;

    // Check if exists
    const existing = await mssqlPrisma.trees.findUnique({
      where: { Code }
    });

    if (existing) {
      return res.status(409).json({ error: 'Tree code already exists' });
    }

    const newTree = await mssqlPrisma.trees.create({
      data: {
        Code,
        Description
      }
    });

    res.status(201).json(newTree);
  } catch (error) {
    logger.error('Error creating tree:', error);
    res.status(500).json({ error: 'Failed to create tree' });
  }
};

// Update tree
exports.update = async (req, res) => {
  try {
    const { code } = req.params;
    const { Description } = req.body;

    const updatedTree = await mssqlPrisma.trees.update({
      where: { Code: code },
      data: {
        Description
      }
    });

    res.json(updatedTree);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tree not found' });
    }
    logger.error(`Error updating tree ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to update tree' });
  }
};

// Delete tree
exports.delete = async (req, res) => {
  try {
    const { code } = req.params;

    await mssqlPrisma.trees.delete({
      where: { Code: code }
    });

    res.json({ message: 'Tree deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tree not found' });
    }
    logger.error(`Error deleting tree ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to delete tree' });
  }
};
