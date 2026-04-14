const faasService = require('../services/faasService');
const { AppError } = require('../../../middleware/errorHandler');

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

exports.getTdnHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await faasService.getTdnHistory(id);
    res.status(200).json({
      success: true,
      data: rows
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

exports.bulkMigrate = async (req, res, next) => {
  try {
    const { properties, migrationType, skipExisting = false } = req.body;
    const userEmail = req.user ? req.user.email : 'anonymous';
    const userId = req.user ? req.user.id : null;

    if (!properties || !Array.isArray(properties)) {
      throw new AppError('Properties array is required', 400);
    }

    const result = await faasService.bulkMigrate(properties, migrationType, userEmail, userId, skipExisting);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.checkExistingTdns = async (req, res, next) => {
  try {
    const { tdns } = req.body;
    if (!tdns || !Array.isArray(tdns)) {
      throw new AppError('TDNs array is required', 400);
    }

    const existingTdns = await faasService.checkExistingTdns(tdns);

    res.status(200).json({
      success: true,
      data: existingTdns
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

exports.getDistinctTaxBegYears = async (req, res, next) => {
  try {
    const years = await faasService.getDistinctTaxBegYears();
    res.status(200).json({
      success: true,
      data: years
    });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks, approverName, approverPosition } = req.body;
    const userEmail = req.user ? req.user.email : 'anonymous';
    const userId = req.user ? req.user.id : null;

    if (!['draft', 'for-review', 'pending-municipal', 'pending-provincial', 'approved', 'rejected', 'rejected-municipal', 'rejected-provincial'].includes(status)) {
        throw new AppError('Invalid status value', 400);
    }

    const record = await faasService.updateStatus(id, status, remarks, userEmail, userId, approverName, approverPosition);

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

exports.batchUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status, remarks, approverName, approverPosition } = req.body;
    const userEmail = req.user ? req.user.email : 'anonymous';
    const userId = req.user ? req.user.id : null;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No IDs provided', 400);
    }

    if (!['draft', 'for-review', 'pending-municipal', 'pending-provincial', 'approved', 'rejected', 'rejected-municipal', 'rejected-provincial'].includes(status)) {
        throw new AppError('Invalid status value', 400);
    }

    const results = await faasService.batchUpdateStatus(ids, status, remarks, userEmail, userId, approverName, approverPosition);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};
