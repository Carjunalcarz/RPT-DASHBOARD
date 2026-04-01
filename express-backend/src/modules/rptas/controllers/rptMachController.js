const rptMachService = require('../services/rptMachService');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class RptMachController {
  /**
   * Get all machinery records
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, Tdn, KIND, Classification, MachineDesc } = req.query;
      
      const filters = {};
      if (Tdn) filters.Tdn = Tdn;
      if (KIND) filters.KIND = KIND;
      if (Classification) filters.Classification = Classification;
      if (MachineDesc) filters.MachineDesc = `%${MachineDesc}%`;

      const result = await rptMachService.getAll({ 
        page, 
        limit, 
        sortBy, 
        sortOrder, 
        filters 
      });

      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get machinery by TDN
   */
  async getByTdn(req, res, next) {
    try {
      const { tdn } = req.params;
      const result = await rptMachService.getByTdn(tdn);
      
      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RptMachController();
