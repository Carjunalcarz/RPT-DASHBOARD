const actualUseService = require('../services/actualUseService');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class ActualUseController {
  /**
   * Get paginated list of actual uses
   */
  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;
      const search = req.query.search || '';
      const mainClass = req.query.mainClass || '';

      if (page < 1 || pageSize < 1) {
        throw new AppError('Page and pageSize must be positive integers', 400);
      }

      const result = await actualUseService.getActualUses({ page, pageSize, search, mainClass });

      res.status(200).json({
        status: 'success',
        data: result.data,
        metadata: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ActualUseController();
