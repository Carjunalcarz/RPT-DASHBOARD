const bldgUnitCostService = require('../services/bldgUnitCostService');
const { AppError } = require('../middleware/errorHandler');

class BldgUnitCostController {
  async getAll(req, res, next) {
    try {
      const { page, limit, strucType, bldgCode, city } = req.query;
      const result = await bldgUnitCostService.getAll({ 
        page, 
        limit, 
        strucType, 
        bldgCode,
        city
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUnitCost(req, res, next) {
    try {
      const { strucType, bldgCode, city } = req.query;
      if (!strucType || !bldgCode) {
        throw new AppError('strucType and bldgCode are required', 400);
      }
      const result = await bldgUnitCostService.getUnitCost(strucType, bldgCode, city);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Unit cost not found' });
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BldgUnitCostController();