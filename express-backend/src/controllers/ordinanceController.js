const ordinanceService = require('../services/ordinanceService');
const { AppError } = require('../middleware/errorHandler');

class OrdinanceController {
  async getAll(req, res, next) {
    try {
      const { page, limit, type, class: structureClass, subClass } = req.query;
      const result = await ordinanceService.getAll({ 
        page, 
        limit, 
        buildingTypeCode: type, 
        structureClass,
        subClass 
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLookup(req, res, next) {
    try {
      const { type, class: structureClass, subClass } = req.query;
      if (!type || !structureClass || !subClass) {
        throw new AppError('type, class, and subClass are required', 400);
      }
      const result = await ordinanceService.getUnitValue(type, structureClass, subClass);
      
      if (!result) {
        return res.status(404).json({ success: false, message: 'Value not found' });
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrdinanceController();