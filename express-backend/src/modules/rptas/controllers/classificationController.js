const classificationService = require('../services/classificationService');
const logger = require('../../../utils/logger');
const mainClassCustomService = require('../services/mainClassCustomSupabaseService');
const mainclassActualUseService = require('../services/mainclassActualUseSupabaseService');

// Get all classifications
exports.getAll = async (req, res) => {
  try {
    const result = await classificationService.getClassifications();
    res.json(result);
  } catch (error) {
    logger.error('Error fetching classifications:', error);
    try {
      const custom = await mainClassCustomService.list({ search: '' });
      const fromSetup = await mainclassActualUseService.listDistinctMainClasses();

      const merged = [
        ...(fromSetup || []).map((c) => ({
          Code: c.mainclass_code,
          Description: c.mainclass_name,
        })),
        ...(custom || []).map((c) => ({
          Code: c.code,
          Description: c.description,
        })),
      ].filter((c) => c.Code);

      const seen = new Set();
      const data = merged.filter((c) => (seen.has(String(c.Code).trim().toUpperCase()) ? false : (seen.add(String(c.Code).trim().toUpperCase()), true)));
      res.status(200).json({ data });
    } catch (fallbackError) {
      logger.error('Error fetching custom classifications fallback:', fallbackError);
      res.status(500).json({ error: 'Failed to fetch classifications' });
    }
  }
};

// Get single classification by Code
exports.getOne = async (req, res) => {
  try {
    const { code } = req.params;
    const classification = await classificationService.getClassificationByCode(code);

    if (!classification) {
      return res.status(404).json({ error: 'Classification not found' });
    }

    res.json(classification);
  } catch (error) {
    logger.error(`Error fetching classification ${req.params.code}:`, error);
    res.status(500).json({ error: 'Failed to fetch classification' });
  }
};

// ... other endpoints (create, update, delete, getFull) can remain unimplemented or return 400 
// since MSSQL reference data is read-only for now, just like ACTUALUSE
exports.getFull = async (req, res) => {
  res.status(501).json({ error: 'Not implemented for MSSQL yet' });
};
exports.create = async (req, res) => {
  res.status(501).json({ error: 'Not implemented for MSSQL yet' });
};
exports.update = async (req, res) => {
  res.status(501).json({ error: 'Not implemented for MSSQL yet' });
};
exports.delete = async (req, res) => {
  res.status(501).json({ error: 'Not implemented for MSSQL yet' });
};
