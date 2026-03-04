const faasService = require('../services/faasService');
const { AppError } = require('../middleware/errorHandler');

exports.saveDraft = async (req, res, next) => {
  try {
    // Assuming req.user is populated by auth middleware
    const userEmail = req.user ? req.user.email : 'anonymous';
    const record = await faasService.saveDraft(req.body, userEmail);
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.submitForReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await faasService.submitForReview(id);
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await faasService.getRecord(id);
    if (!record) {
      throw new AppError('Record not found', 404);
    }
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.listRecords = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const result = await faasService.listRecords({ status, page, limit });
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};