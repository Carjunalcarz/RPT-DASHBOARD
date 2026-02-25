const bldgAdjService = require('../services/bldgAdjService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class BldgAdjController {
  async getAll(req, res, next) {
    try {
      const { page, limit, sortBy, sortOrder, ...filters } = req.query;
      const result = await bldgAdjService.getAll({
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
      const records = await bldgAdjService.getByTdn(tdn);

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
      const newRecord = await bldgAdjService.create(req.body);

      logger.info(`Created BLDG_ADJ record: ${newRecord.TDN} - ${newRecord.SeqNo}`);

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
      const { tdn, seqNo } = req.params;
      const updatedRecord = await bldgAdjService.update(tdn, seqNo, req.body);

      logger.info(`Updated BLDG_ADJ record: ${tdn} - ${seqNo}`);

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
      const { tdn, seqNo } = req.params;
      const deletedRecord = await bldgAdjService.delete(tdn, seqNo);

      logger.info(`Deleted BLDG_ADJ record: ${tdn} - ${seqNo}`);

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

module.exports = new BldgAdjController();
