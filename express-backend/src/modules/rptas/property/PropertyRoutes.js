const { Router } = require('express');
const protect = require('../../../middleware/auth');

function createPropertyRoutes({ propertyController }) {
  const router = Router();

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
 *         description: Items per page
 *       - in: query
 *         name: searchField
 *         schema:
 *           type: string
 *         description: Field to search
 *       - in: query
 *         name: filterValue
 *         schema:
 *           type: string
 *         description: Value to search
 *       - in: query
 *         name: municipalityCode
 *         schema:
 *           type: string
 *         description: (Admin only) Filter by specific municipality code
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
router.get('/RPTAS_AGUSAN', protect, (req, res, next) => propertyController.getAgusanMigrationData(req, res, next));

/**
 * @swagger
 * /api/rptmast/signatories/{tdn}:
 *   put:
 *     summary: Update signatory information
 *     tags: [RPTMAST]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Signatory updated successfully
 *       500:
 *         description: Server error
 */
router.put('/signatories/:tdn', protect, (req, res, next) => propertyController.updateSignatory(req, res, next));

/**
 * @swagger
 * /api/rptmast/mastextn/{tdn}:
 *   get:
 *     summary: Get MASTEXTN data by TDN
 *     tags: [RPTMAST]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: MASTEXTN data retrieved
 *       404:
 *         description: Not found
 */
router.get('/mastextn/:tdn', protect, (req, res, next) => propertyController.getMastExtn(req, res, next));

  return router;
}

module.exports = createPropertyRoutes;
