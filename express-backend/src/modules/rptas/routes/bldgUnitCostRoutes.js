const express = require('express');
const router = express.Router();
const bldgUnitCostController = require('../controllers/bldgUnitCostController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: BLDG_UNITCOST
 *   description: Building Unit Cost Reference
 */

/**
 * @swagger
 * /api/bldg-unit-cost:
 *   get:
 *     summary: Get all building unit costs
 *     tags: [BLDG_UNITCOST]
 *     parameters:
 *       - in: query
 *         name: strucType
 *         schema:
 *           type: string
 *       - in: query
 *         name: bldgCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of unit costs
 */
router.get('/', protect, bldgUnitCostController.getAll);

router.get('/distinct/eff-dates', protect, bldgUnitCostController.getDistinctEffDates);

router.get('/sets', protect, bldgUnitCostController.listUnitCostSets);
router.post('/sets', protect, protect.restrictTo('admin'), bldgUnitCostController.createUnitCostSet);
router.get('/sets/:id', protect, bldgUnitCostController.getUnitCostSet);
router.get('/sets/:id/items', protect, bldgUnitCostController.listUnitCostSetItems);
router.post('/sets/:id/items', protect, protect.restrictTo('admin'), bldgUnitCostController.createUnitCostSetItem);
router.put('/sets/:id/items/:itemId', protect, protect.restrictTo('admin'), bldgUnitCostController.updateUnitCostSetItem);
router.delete('/sets/:id/items/:itemId', protect, protect.restrictTo('admin'), bldgUnitCostController.deleteUnitCostSetItem);
router.patch('/sets/:id', protect, protect.restrictTo('admin'), bldgUnitCostController.updateUnitCostSet);
router.post('/sets/:id/restore', protect, protect.restrictTo('admin'), bldgUnitCostController.restoreUnitCostSet);
router.post('/sets/:id/items/:itemId/restore', protect, protect.restrictTo('admin'), bldgUnitCostController.restoreUnitCostSetItem);
router.delete('/sets/:id', protect, protect.restrictTo('admin'), bldgUnitCostController.deleteUnitCostSet);

/**
 * @swagger
 * /api/bldg-unit-cost/lookup:
 *   get:
 *     summary: Lookup specific unit cost
 *     tags: [BLDG_UNITCOST]
 *     parameters:
 *       - in: query
 *         name: strucType
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: bldgCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unit cost details
 */
router.get('/lookup', protect, bldgUnitCostController.getUnitCost);

module.exports = router;
