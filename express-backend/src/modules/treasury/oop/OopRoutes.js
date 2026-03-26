const { Router } = require('express');
const protect = require('../../../middleware/auth');

function createOopRoutes({ oopController }) {
  const router = Router();

router.use(protect);

router.post('/', (req, res, next) => oopController.create(req, res, next));
router.patch('/:id', (req, res, next) => oopController.update(req, res, next));
router.post('/:id/cancel', (req, res, next) => oopController.cancel(req, res, next));
router.post('/:id/pay', (req, res, next) => oopController.markPaid(req, res, next));
router.get('/pending', (req, res, next) => oopController.listPending(req, res, next));
router.get('/:id/history', (req, res, next) => oopController.history(req, res, next));
router.get('/:id', (req, res, next) => oopController.getOne(req, res, next));

  return router;
}

module.exports = createOopRoutes;
