const rptTreeService = require('../services/rptTreeService');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class RptTreeController {
  /**
   * Get all trees
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, TDN, Prod_Code } = req.query;
      
      const filters = {
        TDN,
        Prod_Code
      };

      const result = await rptTreeService.getAll({ 
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
   * Get trees by TDN
   */
  async getByTdn(req, res, next) {
    try {
      const { tdn } = req.params;
      const result = await rptTreeService.getByTdn(tdn);
      
      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tree reference library (rates)
   */
  async getTreeLibrary(req, res, next) {
    try {
      const result = await rptTreeService.getTreeLibrary();
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RptTreeController();
