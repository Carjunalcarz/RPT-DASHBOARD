const express = require('express');
const rptTreeController = require('../controllers/rptTreeController');
const protect = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: RPT Tree
 *   description: Real Property Tax Tree Management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RptTree:
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
 *         Prod_Code:
 *           type: string
 *         Area:
 *           type: number
 *         Tot_FB:
 *           type: number
 *         Non_FB:
 *           type: number
 *         FB:
 *           type: number
 *         Age:
 *           type: number
 *         Unit_Price:
 *           type: number
 *         Market_Value:
 *           type: number
 *         NFB_UnitPrice:
 *           type: number
 */

/**
 * @swagger
 * /api/v1/rpt-tree:
 *   get:
 *     summary: Get all tree records
 *     tags: [RPT Tree]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 200
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: TDN
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: TDN
 *         schema:
 *           type: string
 *         description: Filter by TDN
 *       - in: query
 *         name: Prod_Code
 *         schema:
 *           type: string
 *         description: Filter by Product Code
 *     responses:
 *       200:
 *         description: List of tree records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RptTree'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', rptTreeController.getAll.bind(rptTreeController));

/**
 * @swagger
 * /api/v1/rpt-tree/library:
 *   get:
 *     summary: Get tree reference library with rates
 *     tags: [RPT Tree]
 *     responses:
 *       200:
 *         description: List of tree references
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 */
router.get('/library', rptTreeController.getTreeLibrary.bind(rptTreeController));

/**
 * @swagger
 * /api/v1/rpt-tree/{tdn}:
 *   get:
 *     summary: Get tree records by TDN
 *     tags: [RPT Tree]
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax Declaration Number
 *     responses:
 *       200:
 *         description: Tree records details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RptTree'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/:tdn', rptTreeController.getByTdn.bind(rptTreeController));

module.exports = router;
