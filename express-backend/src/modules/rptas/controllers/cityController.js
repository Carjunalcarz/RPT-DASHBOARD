const cityService = require('../services/cityService');
const { AppError } = require('../../../middleware/errorHandler');

class CityController {
  /**
   * Get paginated list of cities/municipalities
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getCities(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 100;
      const search = req.query.search || '';

      if (page < 1 || pageSize < 1) {
        throw new AppError('Page and pageSize must be positive integers', 400);
      }

      const result = await cityService.getCities({ page, pageSize, search });

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

module.exports = new CityController();