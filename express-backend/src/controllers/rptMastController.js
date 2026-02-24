const rptMastService = require('../services/rptMastService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Controller for RPTMAST operations
 */
class RptMastController {
  /**
   * Get eligible migration records from RPTAS_AGUSAN
   * GET /api/rptmast/RPTAS_AGUSAN
   */
  async getAgusanMigrationData(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      
      const result = await rptMastService.getAgusanMigrationData({ page, limit });
      
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

module.exports = new RptMastController();
