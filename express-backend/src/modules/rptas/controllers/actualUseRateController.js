const service = require('../services/actualUseRateSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class ActualUseRateController {
  async getAll(req, res, next) {
    try {
      const rows = await service.getAll();
      res.status(200).json({
        status: 'success',
        data: rows,
      });
    } catch (error) {
      next(new AppError('Failed to fetch actual use rates: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { mainClassCode, actualUseCode, actualUseName, rate } = req.body || {};

      if (!mainClassCode || String(mainClassCode).trim() === '') {
        return next(new AppError('Main Class Code is required', 400));
      }
      if (!actualUseCode || String(actualUseCode).trim() === '') {
        return next(new AppError('Actual Use Code is required', 400));
      }
      if (!actualUseName || String(actualUseName).trim() === '') {
        return next(new AppError('Actual Use Name is required', 400));
      }

      const normalizedRate = rate === '' || rate === null || rate === undefined ? null : Number(rate);
      if (normalizedRate !== null && (Number.isNaN(normalizedRate) || !Number.isFinite(normalizedRate))) {
        return next(new AppError('Rate must be a valid number', 400));
      }
      if (normalizedRate !== null && normalizedRate < 0) {
        return next(new AppError('Rate must be 0 or greater', 400));
      }

      const saved = await service.upsert(
        String(mainClassCode).trim(),
        String(actualUseCode).trim(),
        String(actualUseName).trim(),
        normalizedRate
      );

      res.status(200).json({
        status: 'success',
        message: 'Actual Use rate saved successfully',
        data: saved,
      });
    } catch (error) {
      next(new AppError('Failed to save actual use rate: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(200).json({
        status: 'success',
        message: 'Actual Use rate deleted successfully',
      });
    } catch (error) {
      next(new AppError('Failed to delete actual use rate: ' + error.message, 500));
    }
  }
}

module.exports = new ActualUseRateController();

