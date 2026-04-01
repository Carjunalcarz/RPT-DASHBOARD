const oopService = require('../../../services/oopService');
const logger = require('../../../utils/logger');

const parseAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

exports.create = async (req, res, next) => {
  try {
    const amount = parseAmount(req.body.amount);
    if (amount === null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const order = await oopService.createOrder({
      user: req.user,
      amount,
      description: req.body.description || null,
      requestBody: req.body,
    });

    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    logger.error('Error creating OOP:', error);
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const amount = req.body.amount !== undefined ? parseAmount(req.body.amount) : undefined;
    if (amount !== undefined && (amount === null || amount <= 0)) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const order = await oopService.updateOrder({
      user: req.user,
      orderId: req.params.id,
      amount,
      description: req.body.description,
      requestBody: req.body,
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    logger.error('Error updating OOP:', error);
    return next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const order = await oopService.cancelOrder({
      user: req.user,
      orderId: req.params.id,
      requestBody: req.body,
    });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    logger.error('Error cancelling OOP:', error);
    return next(error);
  }
};

exports.markPaid = async (req, res, next) => {
  try {
    const result = await oopService.markPaid({
      user: req.user,
      orderId: req.params.id,
      requestBody: req.body,
    });
    return res.status(200).json({ success: true, data: result.order, etl: result.etl });
  } catch (error) {
    logger.error('Error marking OOP paid:', error);
    return next(error);
  }
};

exports.listPending = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await oopService.listPending({ user: req.user, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error('Error listing pending OOP:', error);
    return next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const order = await oopService.getOrder({ user: req.user, orderId: req.params.id });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    logger.error('Error fetching OOP:', error);
    return next(error);
  }
};

exports.history = async (req, res, next) => {
  try {
    const result = await oopService.getHistory({ user: req.user, orderId: req.params.id });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching OOP history:', error);
    return next(error);
  }
};
