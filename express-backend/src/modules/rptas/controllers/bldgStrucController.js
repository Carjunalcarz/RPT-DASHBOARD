const bldgStrucService = require('../services/bldgStrucService');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

class BldgStrucController {
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, ...filters } = req.query;
      const result = await bldgStrucService.getAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
        filters
      });

      res.status(200).json({
        success: true,
        count: result.pagination.total,
        pagination: result.pagination,
        data: result.data
      });
    } catch (error) {
      next(error);
    }
  }

  async getByTdn(req, res, next) {
    try {
      const { tdn } = req.params;
      const records = await bldgStrucService.getByTdn(tdn);

      res.status(200).json({
        success: true,
        count: records.length,
        data: records
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newRecord = await bldgStrucService.create(req.body);

      logger.info(`Created BLDG_STRUC record: ${newRecord.TDN}`);

      res.status(201).json({
        success: true,
        data: newRecord
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { tdn, floorOrd } = req.params;
      const updatedRecord = await bldgStrucService.update(tdn, floorOrd, req.body);

      logger.info(`Updated BLDG_STRUC record: ${tdn} - Floor: ${floorOrd}`);

      res.status(200).json({
        success: true,
        data: updatedRecord
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { tdn, floorOrd } = req.params;
      const deletedRecord = await bldgStrucService.delete(tdn, floorOrd);

      logger.info(`Deleted BLDG_STRUC record: ${tdn} - Floor: ${floorOrd}`);

      res.status(200).json({
        success: true,
        message: 'Record successfully deleted',
        data: deletedRecord
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BldgStrucController();
