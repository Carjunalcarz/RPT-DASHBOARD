const express = require('express');
const router = express.Router();
const ordinanceController = require('../controllers/ordinanceController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: ORDINANCE_2024
 *   description: 2024 Provincial Ordinance Schedule of Market Values
 */

/**
 * @swagger
 * /api/ordinance/2024:
 *   get:
 *     summary: Get schedule of market values
 *     tags: [ORDINANCE_2024]
 *     parameters:
 *       - in: query
 *         name: type
 *         description: Building Type Code (RES, COM, etc.)
 *         schema:
 *           type: string
 *       - in: query
 *         name: class
 *         description: Structural Class (I, II, III, IV, V)
 *         schema:
 *           type: string
 *       - in: query
 *         name: subClass
 *         description: Sub Class (A, B, C)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of values
 */
router.get('/2024', protect, ordinanceController.getAll);

/**
 * @swagger
 * /api/ordinance/2024/lookup:
 *   get:
 *     summary: Lookup specific unit value
 *     tags: [ORDINANCE_2024]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: class
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: subClass
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unit value
 */
router.get('/2024/lookup', protect, ordinanceController.getLookup);

module.exports = router;