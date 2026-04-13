const express = require('express');
const router = express.Router();
const controller = require('../controllers/actualUseOrdinanceController');
const protect = require('../../../middleware/auth');

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

router.get('/', protect, (req, res, next) => controller.list(req, res, next));
router.post('/', protect, (req, res, next) => controller.upsert(req, res, next));
router.delete('/:id', protect, (req, res, next) => controller.delete(req, res, next));

module.exports = router;
