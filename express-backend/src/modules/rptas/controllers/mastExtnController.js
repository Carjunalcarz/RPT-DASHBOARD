const mastExtnService = require('../services/mastExtnService');
const { AppError } = require('../../../middleware/errorHandler');

/**
 * Controller for MASTEXTN operations
 */
class MastExtnController {
  /**
   * Get MASTEXTN records
   * GET /api/mastextn
   */
  async getMastExtnData(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const tdn = req.query.tdn; // Optional filter by TDN
      
      const result = await mastExtnService.getMastExtnData({ page, limit, tdn });
      
      res.status(200).json({
        success: true,
        count: result.data.length,
        pagination: result.pagination,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MastExtnController();
