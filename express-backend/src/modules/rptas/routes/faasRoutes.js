const express = require('express');
const router = express.Router();
const faasController = require('../controllers/faasController');
const protect = require('../../../middleware/auth'); // Import protect directly

// Restrict editing operations to Admin
const restrictToAdmin = protect.restrictTo('admin', 'Administrator');

router.put('/:id/status', protect, restrictToAdmin, faasController.updateStatus);
router.post('/batch-status', protect, restrictToAdmin, faasController.batchUpdateStatus); // New batch endpoint
router.post('/check-existing', protect, restrictToAdmin, faasController.checkExistingTdns);
router.post('/bulk-migrate', protect, restrictToAdmin, faasController.bulkMigrate);
router.post('/draft', protect, restrictToAdmin, faasController.saveDraft);
router.put('/:id', protect, restrictToAdmin, faasController.saveDraft); // Use saveDraft for PUT as well (upsert logic)
router.patch('/:id', protect, restrictToAdmin, faasController.saveDraft); // Use saveDraft for PATCH as well
router.post('/:id/submit', protect, restrictToAdmin, faasController.submitForReview);
router.post('/:id/cancel-transaction', protect, restrictToAdmin, faasController.cancelTransaction);
router.get('/:id/tdn-history', protect, faasController.getTdnHistory);
router.get('/:id', protect, faasController.getRecord);
router.delete('/:id', protect, restrictToAdmin, faasController.deleteRecord);
router.get('/distinct/tax-beg-years', protect, faasController.getDistinctTaxBegYears);
router.get('/', protect, faasController.listRecords);

module.exports = router;
