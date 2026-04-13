const service = require('../services/classificationRateSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class ClassificationRateController {
  async getAll(req, res, next) {
    try {
      const rows = await service.getAll();
      res.status(200).json({
        status: 'success',
        data: rows,
      });
    } catch (error) {
      next(new AppError('Failed to fetch classification rates: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { code, name, rate } = req.body || {};

      if (!code || String(code).trim() === '') {
        return next(new AppError('Classification code is required', 400));
      }
      if (!name || String(name).trim() === '') {
        return next(new AppError('Classification name is required', 400));
      }

      const normalizedRate = rate === '' || rate === null || rate === undefined ? null : Number(rate);
      if (normalizedRate !== null && (Number.isNaN(normalizedRate) || !Number.isFinite(normalizedRate))) {
        return next(new AppError('Rate must be a valid number', 400));
      }
      if (normalizedRate !== null && normalizedRate < 0) {
        return next(new AppError('Rate must be 0 or greater', 400));
      }

      const saved = await service.upsert(String(code).trim(), String(name).trim(), normalizedRate);

      res.status(200).json({
        status: 'success',
        message: 'Classification rate saved successfully',
        data: saved,
      });
    } catch (error) {
      next(new AppError('Failed to save classification rate: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(200).json({
        status: 'success',
        message: 'Classification rate deleted successfully',
      });
    } catch (error) {
      next(new AppError('Failed to delete classification rate: ' + error.message, 500));
    }
  }
}

module.exports = new ClassificationRateController();

