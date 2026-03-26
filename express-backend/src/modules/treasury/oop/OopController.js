const logger = require('../../../utils/logger');

class OopController {
  constructor({ oopService }) {
    this.oopService = oopService;
  }

  parseAmount = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return num;
  };

create = async (req, res, next) => {
  try {
    const amount = this.parseAmount(req.body.amount);
    if (amount === null || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const order = await this.oopService.createOrder({
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

update = async (req, res, next) => {
  try {
    const amount = req.body.amount !== undefined ? parseAmount(req.body.amount) : undefined;
    if (amount !== undefined && (amount === null || amount <= 0)) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const order = await this.oopService.updateOrder({
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

cancel = async (req, res, next) => {
  try {
    const order = await this.oopService.cancelOrder({
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

markPaid = async (req, res, next) => {
  try {
    const result = await this.oopService.markPaid({
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

listPending = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await this.oopService.listPending({ user: req.user, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error('Error listing pending OOP:', error);
    return next(error);
  }
};

getOne = async (req, res, next) => {
  try {
    const order = await this.oopService.getOrder({ user: req.user, orderId: req.params.id });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    logger.error('Error fetching OOP:', error);
    return next(error);
  }
};

history = async (req, res, next) => {
  try {
    const result = await this.oopService.getHistory({ user: req.user, orderId: req.params.id });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching OOP history:', error);
    return next(error);
  }
};
}

module.exports = OopController;