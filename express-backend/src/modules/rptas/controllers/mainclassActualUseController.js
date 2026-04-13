const setupService = require('../services/mainclassActualUseSupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class MainclassActualUseController {
  async getAll(req, res, next) {
    try {
      const municipalityCode = req.query?.municipalityCode ? String(req.query.municipalityCode).trim() : null;
      const classLevel = req.query?.classLevel ? String(req.query.classLevel).trim() : null;
      const setups = await setupService.getAllSetups(municipalityCode, classLevel);
      res.status(200).json({
        status: 'success',
        data: setups
      });
    } catch (error) {
      next(new AppError('Failed to fetch mainclass-actualuse setups: ' + error.message, 500));
    }
  }

  async getByMainClass(req, res, next) {
    try {
      const { code } = req.params;
      const municipalityCode = req.query?.municipalityCode ? String(req.query.municipalityCode).trim() : null;
      const classLevel = req.query?.classLevel ? String(req.query.classLevel).trim() : null;

      if (!municipalityCode || !classLevel) {
        return next(new AppError('municipalityCode and classLevel are required', 400));
      }

      const setup = await setupService.getSetupByMainClass(municipalityCode, classLevel, code);
      
      if (!setup) {
        return res.status(404).json({
          status: 'error',
          message: 'No setup found for this main class'
        });
      }

      res.status(200).json({
        status: 'success',
        data: setup
      });
    } catch (error) {
      next(new AppError('Failed to fetch setup: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { municipalityCode, classLevel, ordinanceNo, dateApproved, mainClassCode, mainClassName, actualUses } = req.body;

      if (!municipalityCode || !classLevel) {
        return next(new AppError('Municipality Code and Class Level are required', 400));
      }

      if (!ordinanceNo || !dateApproved) {
        return next(new AppError('Ordinance No. and Date Approved are required', 400));
      }

      if (!mainClassCode || !mainClassName) {
        return next(new AppError('Main Class Code and Name are required', 400));
      }

      if (!Array.isArray(actualUses) || actualUses.length === 0) {
        return next(new AppError('At least one actual use must be selected', 400));
      }

      const savedSetup = await setupService.upsertSetup(
        String(municipalityCode).trim(),
        String(classLevel).trim(),
        String(ordinanceNo).trim(),
        String(dateApproved).trim(),
        String(mainClassCode).trim(),
        String(mainClassName).trim(),
        actualUses
      );

      res.status(200).json({
        status: 'success',
        message: 'Main Class and Actual Uses mapped successfully',
        data: savedSetup
      });
    } catch (error) {
      next(new AppError('Failed to save setup: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await setupService.deleteSetup(id);
      
      res.status(200).json({
        status: 'success',
        message: 'Setup deleted successfully'
      });
    } catch (error) {
      next(new AppError('Failed to delete setup: ' + error.message, 500));
    }
  }
}

module.exports = new MainclassActualUseController();
