const service = require('../services/actualUseRateSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class ActualUseRateController {
  async getAll(req, res, next) {
    try {
      const municipalityCode = req.query?.municipalityCode ? String(req.query.municipalityCode).trim() : null;
      const classLevel = req.query?.classLevel ? String(req.query.classLevel).trim() : null;
      const ordinanceNo = req.query?.ordinanceNo ? String(req.query.ordinanceNo).trim() : null;
      const mainClassCode = req.query?.mainClassCode ? String(req.query.mainClassCode).trim() : null;
      const rows = await service.getAll({ municipalityCode, classLevel, ordinanceNo, mainClassCode });
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
      const { municipalityCode, classLevel, ordinanceNo, mainClassCode, actualUseCode, actualUseName, rate } = req.body || {};

      if (!municipalityCode || String(municipalityCode).trim() === '') {
        return next(new AppError('Municipality Code is required', 400));
      }
      if (!classLevel || String(classLevel).trim() === '') {
        return next(new AppError('Class Level is required', 400));
      }
      if (!ordinanceNo || String(ordinanceNo).trim() === '') {
        return next(new AppError('Ordinance No. is required', 400));
      }
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
        String(municipalityCode).trim(),
        String(classLevel).trim(),
        String(ordinanceNo).trim(),
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
