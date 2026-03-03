const express = require('express');
const router = express.Router();
const treesController = require('../controllers/treesController');
const protect = require('../middleware/auth');

router.get('/', protect, treesController.getAll);
router.get('/:code', protect, treesController.getOne);
router.post('/', protect, treesController.create);
router.put('/:code', protect, treesController.update);
router.delete('/:code', protect, treesController.delete);

module.exports = router;
