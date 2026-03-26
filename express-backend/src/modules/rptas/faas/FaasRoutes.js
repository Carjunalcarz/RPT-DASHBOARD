const { Router } = require('express');
const protect = require('../../../middleware/auth');

function createFaasRoutes({ faasController }) {
  const router = Router();
  
  const restrictToAdmin = protect.restrictTo('admin', 'Administrator');

  router.put('/:id/status', protect, restrictToAdmin, faasController.updateStatus);
  router.post('/batch-status', protect, restrictToAdmin, faasController.batchUpdateStatus);
  router.post('/check-existing', protect, restrictToAdmin, faasController.checkExistingTdns);
  router.post('/bulk-migrate', protect, restrictToAdmin, faasController.bulkMigrate);
  router.post('/draft', protect, restrictToAdmin, faasController.saveDraft);
  router.put('/:id', protect, restrictToAdmin, faasController.saveDraft);
  router.patch('/:id', protect, restrictToAdmin, faasController.saveDraft);
  router.post('/:id/submit', protect, restrictToAdmin, faasController.submitForReview);
  router.post('/:id/cancel-transaction', protect, restrictToAdmin, faasController.cancelTransaction);
  router.get('/:id/tdn-history', protect, faasController.getTdnHistory);
  router.get('/:id', protect, faasController.getRecord);
  router.delete('/:id', protect, restrictToAdmin, faasController.deleteRecord);
  router.get('/', protect, faasController.listRecords);

  return router;
}

module.exports = createFaasRoutes;
