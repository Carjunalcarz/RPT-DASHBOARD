const express = require('express');
const controller = require('../controllers/oopController');
const protect = require('../../../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', controller.create);
router.patch('/:id', controller.update);
router.post('/:id/cancel', controller.cancel);
router.post('/:id/pay', controller.markPaid);
router.get('/pending', controller.listPending);
router.get('/:id/history', controller.history);
router.get('/:id', controller.getOne);

module.exports = router;
