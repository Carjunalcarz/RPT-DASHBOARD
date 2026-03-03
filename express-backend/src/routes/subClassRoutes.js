const express = require('express');
const router = express.Router();
const subClassController = require('../controllers/subClassController');
const protect = require('../middleware/auth');

router.get('/', protect, subClassController.getAll);
router.get('/:region/:prov/:city/:code/:mainClass', protect, subClassController.getOne);
router.post('/', protect, subClassController.create);
router.put('/:region/:prov/:city/:code/:mainClass', protect, subClassController.update);
router.delete('/:region/:prov/:city/:code/:mainClass', protect, subClassController.delete);

module.exports = router;
