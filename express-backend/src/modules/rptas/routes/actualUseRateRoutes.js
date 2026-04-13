const express = require('express');
const router = express.Router();
const controller = require('../controllers/actualUseRateController');
const protect = require('../../../middleware/auth');

router.get('/', protect, (req, res, next) => controller.getAll(req, res, next));
router.post('/', protect, (req, res, next) => controller.upsert(req, res, next));
router.delete('/:id', protect, (req, res, next) => controller.delete(req, res, next));

module.exports = router;

