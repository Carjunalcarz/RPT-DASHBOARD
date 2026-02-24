const express = require('express');
const router = express.Router();
const rptMastController = require('../controllers/rptMastController');
const protect = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     RptMastRecord:
 *       type: object
 *       properties:
 *         REGION:
 *           type: string
 *         PROV:
 *           type: string
 *         CITY:
 *           type: string
 *         DIST_NO:
 *           type: string
 *         TDN:
 *           type: string
 *         BCODE:
 *           type: string
 *         KIND:
 *           type: string
 *         ARP:
 *           type: string
 *         PIN:
 *           type: string
 *         OWN_CD:
 *           type: string
 *         OWNER_NO:
 *           type: string
 *         # Add other fields as needed for documentation
 */

/**
 * @swagger
 * /api/rptmast/RPTAS_AGUSAN:
 *   get:
 *     summary: Retrieve RPTMAST records eligible for migration
 *     description: Fetches records from RPTAS_AGUSAN.dbo.RPTMAST where CITY='07' and specific NOT EXISTS condition is met.
 *     tags: [RPTMAST]
 *     security:
 *       - bearerAuth: []
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
 *                   example: 150
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RptMastRecord'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Database query failed: Invalid object name 'RPTAS_AGUSAN.dbo.RPTMAST'."
 */
router.get('/RPTAS_AGUSAN', protect, (req, res, next) => rptMastController.getAgusanMigrationData(req, res, next));

module.exports = router;
