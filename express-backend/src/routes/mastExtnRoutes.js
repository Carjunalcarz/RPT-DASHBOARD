const express = require('express');
const router = express.Router();
const mastExtnController = require('../controllers/mastExtnController');
const protect = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     MastExtnRecord:
 *       type: object
 *       properties:
 *         REGION:
 *           type: string
 *         PROV:
 *           type: string
 *         CITY:
 *           type: string
 *         DISTRICT:
 *           type: string
 *         TDN:
 *           type: string
 *         # Add other fields as needed
 */

/**
 * @swagger
 * /api/mastextn:
 *   get:
 *     summary: Retrieve MASTEXTN records
 *     description: Fetches records from MASTEXTN table with optional TDN filtering.
 *     tags: [MASTEXTN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *       - in: query
 *         name: tdn
 *         schema:
 *           type: string
 *         description: Filter by TDN (Tax Declaration Number)
 *     responses:
 *       200:
 *         description: Successful retrieval
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MastExtnRecord'
 *       500:
 *         description: Database error
 */
router.get('/', protect, (req, res, next) => mastExtnController.getMastExtnData(req, res, next));

module.exports = router;
