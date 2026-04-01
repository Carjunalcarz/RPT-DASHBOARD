const express = require('express');
const router = express.Router();
const protect = require('../../../middleware/auth');
const controller = require('../controllers/setupSignatoriesController');

const restrictToAdmin = protect.restrictTo('admin', 'Administrator', 'administrator');

router.get('/', protect, controller.list);
router.post('/', protect, restrictToAdmin, controller.create);
router.get('/:id', protect, controller.getById);
router.put('/:id', protect, restrictToAdmin, controller.update);
router.delete('/:id', protect, restrictToAdmin, controller.remove);

module.exports = router;
