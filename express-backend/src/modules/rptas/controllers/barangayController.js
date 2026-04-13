const barangayService = require('../services/barangayService');
const { AppError } = require('../../../middleware/errorHandler');

class BarangayController {
  /**
   * Get all barangays with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getBarangays(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;
      const search = req.query.search || '';
      const cityCode = req.query.cityCode || '';

      if (page < 1 || pageSize < 1) {
        throw new AppError('Page and pageSize must be positive integers', 400);
      }

      const result = await barangayService.getBarangays({ page, pageSize, search, cityCode });

      if (!result.data || result.data.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'No barangay records found',
          data: [],
          metadata: {
            timestamp: new Date().toISOString()
          }
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Barangay records retrieved successfully',
        data: result.data,
        metadata: {
          ...result.pagination,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BarangayController();
