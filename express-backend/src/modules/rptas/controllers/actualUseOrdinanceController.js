const ordinanceService = require('../services/actualUseOrdinanceSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class ActualUseOrdinanceController {
  async list(req, res, next) {
    try {
      const municipalityCode = req.query?.municipalityCode ? String(req.query.municipalityCode).trim() : null;
      const classLevel = req.query?.classLevel ? String(req.query.classLevel).trim() : null;
      const data = await ordinanceService.list(municipalityCode, classLevel);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(new AppError('Failed to fetch ordinances: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { municipalityCode, classLevel, ordinanceNo, dateApproved } = req.body || {};
      if (!ordinanceNo || !dateApproved) {
        return next(new AppError('Ordinance No. and Date Approved are required', 400));
      }

      const muni = municipalityCode ? String(municipalityCode).trim() : 'ALL';
      const level = classLevel ? String(classLevel).trim() : 'ALL';
      const saved = await ordinanceService.upsert(muni, level, ordinanceNo, dateApproved);
      res.status(200).json({ status: 'success', data: saved });
    } catch (error) {
      next(new AppError('Failed to save ordinance: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await ordinanceService.delete(id);
      res.status(200).json({ status: 'success', message: 'Ordinance deleted successfully' });
    } catch (error) {
      next(new AppError('Failed to delete ordinance: ' + error.message, 500));
    }
  }
}

module.exports = new ActualUseOrdinanceController();
