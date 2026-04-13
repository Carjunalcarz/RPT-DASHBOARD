const cityBarangayService = require('../services/cityBarangaySupabaseService');
const { AppError } = require('../../../middleware/errorHandler');

class CityBarangayController {
  async getAll(req, res, next) {
    try {
      const assignments = await cityBarangayService.getAllAssignments();
      res.status(200).json({
        status: 'success',
        data: assignments
      });
    } catch (error) {
      next(new AppError('Failed to fetch city-barangay assignments: ' + error.message, 500));
    }
  }

  async getByCityCode(req, res, next) {
    try {
      const { cityCode } = req.params;
      const assignment = await cityBarangayService.getAssignmentByCityCode(cityCode);
      
      if (!assignment) {
        return res.status(404).json({
          status: 'error',
          message: 'No assignment found for this city'
        });
      }

      res.status(200).json({
        status: 'success',
        data: assignment
      });
    } catch (error) {
      next(new AppError('Failed to fetch assignment: ' + error.message, 500));
    }
  }

  async upsert(req, res, next) {
    try {
      const { cityCode, cityName, barangays } = req.body;

      if (!cityCode || !cityName) {
        return next(new AppError('City Code and City Name are required', 400));
      }

      if (!Array.isArray(barangays) || barangays.length === 0) {
        return next(new AppError('At least one barangay must be selected', 400));
      }

      const savedAssignment = await cityBarangayService.upsertAssignment(cityCode, cityName, barangays);

      res.status(200).json({
        status: 'success',
        message: 'City and barangays assigned successfully',
        data: savedAssignment
      });
    } catch (error) {
      next(new AppError('Failed to save assignment: ' + error.message, 500));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await cityBarangayService.deleteAssignment(id);
      
      res.status(200).json({
        status: 'success',
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      next(new AppError('Failed to delete assignment: ' + error.message, 500));
    }
  }
}

module.exports = new CityBarangayController();