const faasService = require('../services/faasService');
const { AppError } = require('../middleware/errorHandler');

exports.saveDraft = async (req, res, next) => {
  try {
    // Assuming req.user is populated by auth middleware
    const userEmail = req.user ? req.user.email : 'anonymous';
    const userId = req.user ? req.user.id : null;
    const id = req.params.id || null;
    const record = await faasService.saveDraft(req.body, userEmail, id, userId);
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

exports.cancelTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userEmail = req.user ? req.user.email : 'anonymous';
    const userId = req.user ? req.user.id : null;
    
    await faasService.cancelTransaction(id, userEmail, userId);
    
    res.status(200).json({
      success: true,
      message: 'Transaction cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Assuming audit logging is handled in service or we pass user info
    const userEmail = req.user ? req.user.email : 'anonymous';
    const userId = req.user ? req.user.id : null;
    
    await faasService.deleteRecord(id, userEmail, userId);
    res.status(200).json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.listRecords = async (req, res, next) => {
  try {
    const { status, page, limit, searchField, filterValue } = req.query;
    const result = await faasService.listRecords({ status, page, limit, searchField, filterValue });
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};