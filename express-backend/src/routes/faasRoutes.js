const express = require('express');
const router = express.Router();
const faasController = require('../controllers/faasController');
const protect = require('../middleware/auth'); // Import protect directly, not destructured

router.post('/draft', protect, faasController.saveDraft);
router.post('/:id/submit', protect, faasController.submitForReview);
router.get('/:id', protect, faasController.getRecord);
router.get('/', protect, faasController.listRecords);

module.exports = router;