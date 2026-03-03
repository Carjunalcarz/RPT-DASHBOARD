const express = require('express');
const router = express.Router();
const actualUseController = require('../controllers/actualUseController');
const protect = require('../middleware/auth');

router.get('/', protect, actualUseController.getAll);
router.get('/:region/:prov/:city/:code/:mainClass', protect, actualUseController.getOne);
router.post('/', protect, actualUseController.create);
router.put('/:region/:prov/:city/:code/:mainClass', protect, actualUseController.update);
router.delete('/:region/:prov/:city/:code/:mainClass', protect, actualUseController.delete);

module.exports = router;
