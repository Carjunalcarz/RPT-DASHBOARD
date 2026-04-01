const express = require('express');
const router = express.Router();
const bldgStrucTypeController = require('../controllers/bldgStrucTypeController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: BLDG_STRUCTYPE
 *   description: Building Structure Type Reference
 */

/**
 * @swagger
 * /api/bldg-struc-type:
 *   get:
 *     summary: Get all building structure types
 *     tags: [BLDG_STRUCTYPE]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of structure types
 */
router.get('/', protect, bldgStrucTypeController.getAll);

module.exports = router;