const payorService = require('../../../services/payorService');
const logger = require('../../../utils/logger');

exports.search = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const data = await payorService.searchPayors({ q, limit });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error searching payors:', error);
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await payorService.createPayor({ user: req.user, payload: req.body });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error('Error creating payor:', error);
    return next(error);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { rows } = req.body || {};
    const result = await payorService.bulkCreatePayors({ user: req.user, rows });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error('Error bulk creating payors:', error);
    return next(error);
  }
};

