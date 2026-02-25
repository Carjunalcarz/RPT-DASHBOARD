const rptAssService = require('../services/rptAssService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class RptAssController {
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, ...filters } = req.query;
      const result = await rptAssService.getAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 100,
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

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const record = await rptAssService.getById(id);

      res.status(200).json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newRecord = await rptAssService.create(req.body);

      // Audit Log (Assuming an audit service exists or just log)
      logger.info(`Created RPT_ASS record: ${newRecord.TDN}`);

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
      const { id } = req.params;
      const updatedRecord = await rptAssService.update(id, req.body);

      logger.info(`Updated RPT_ASS record: ${id}`);

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
      const { id } = req.params;
      const deletedRecord = await rptAssService.delete(id, req.user ? req.user.id : 'system');

      logger.info(`Soft deleted RPT_ASS record: ${id}`);

      res.status(200).json({
        success: true,
        message: 'Record successfully deleted (soft delete)',
        data: deletedRecord
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RptAssController();
