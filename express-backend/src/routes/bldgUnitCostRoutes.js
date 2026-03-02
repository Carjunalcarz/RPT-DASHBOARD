const express = require('express');
const router = express.Router();
const bldgUnitCostController = require('../controllers/bldgUnitCostController');
const protect = require('../middleware/auth');

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