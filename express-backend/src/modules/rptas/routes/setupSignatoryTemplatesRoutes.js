const express = require('express');
const protect = require('../../../middleware/auth');
const controller = require('../controllers/setupSignatoryTemplatesController');

const router = express.Router();

const restrictToAdmin = protect.restrictTo('admin', 'Administrator', 'administrator');

router
  .route('/')
  .get(protect, controller.listTemplates)
  .post(protect, restrictToAdmin, controller.createTemplate);

router
  .route('/year/:year')
  .get(protect, controller.getTemplateByYear);

router
  .route('/:id')
  .put(protect, restrictToAdmin, controller.updateTemplate)
  .delete(protect, restrictToAdmin, controller.deleteTemplate);

module.exports = router;
