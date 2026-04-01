const bldgStrucTypeService = require('../services/bldgStrucTypeService');
const { AppError } = require('../../../middleware/errorHandler');

class BldgStrucTypeController {
  async getAll(req, res, next) {
    try {
      const { page, limit, code, city } = req.query;
      const result = await bldgStrucTypeService.getAll({ 
        page, 
        limit, 
        code,
        city
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BldgStrucTypeController();