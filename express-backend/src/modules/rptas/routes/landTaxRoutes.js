const express = require('express');
const router = express.Router();
const landTaxController = require('../controllers/landTaxController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: LandTax
 *   description: New Land Tax Management (PostgreSQL)
 */

router.get('/classifications', protect, landTaxController.getClassifications);
router.get('/subclasses', protect, landTaxController.getSubClasses);
router.get('/market-values', protect, landTaxController.getMarketValues);
router.get('/municipalities', protect, landTaxController.getMunicipalities);
router.get('/agricultural-types', protect, landTaxController.getAgriculturalTypes);

module.exports = router;
