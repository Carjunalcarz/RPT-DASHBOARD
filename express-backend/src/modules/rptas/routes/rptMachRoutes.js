const express = require('express');
const rptMachController = require('../controllers/rptMachController');
const protect = require('../../../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     RptMach:
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
 *         Tdn:
 *           type: string
 *         KIND:
 *           type: string
 *         Classification:
 *           type: string
 *         Actual_use:
 *           type: string
 *         SubClass:
 *           type: string
 *         Code:
 *           type: string
 *         Brand_Model:
 *           type: string
 *         Capacity:
 *           type: string
 *         D_acquired:
 *           type: string
 *           format: date-time
 *         D_installed:
 *           type: string
 *           format: date-time
 *         D_operated:
 *           type: string
 *           format: date-time
 *         Condition:
 *           type: string
 *         Est_life:
 *           type: number
 *         Rem_life:
 *           type: number
 *         No_units:
 *           type: number
 *         Acq_cost:
 *           type: number
 *         Rep_cost:
 *           type: number
 *         Freight:
 *           type: number
 *         Insurance:
 *           type: number
 *         Installation:
 *           type: number
 *         Others:
 *           type: number
 *         Market_val:
 *           type: number
 *         Depreciation:
 *           type: number
 *         Dep_market:
 *           type: number
 *         StraightDep:
 *           type: number
 *         Salvage:
 *           type: number
 *         Acquisition_DPVal:
 *           type: number
 *         Appraisal_DPVal:
 *           type: number
 *         SERIALNO:
 *           type: string
 *         PurchaseType:
 *           type: string
 *         Conv_Factor:
 *           type: number
 *         Adj_Mvalue:
 *           type: number
 *         IncludeUnitCnt:
 *           type: string
 *         Orig_Cost:
 *           type: number
 *         MachineDesc:
 *           type: string
 *         Sub_Tdn:
 *           type: string
 *         UM:
 *           type: string
 *         Disposal_Mvalue:
 *           type: number
 *         NoYrs:
 *           type: number
 */

/**
 * @swagger
 * /api/v1/rpt-mach:
 *   get:
 *     summary: Get all machinery records
 *     tags: [RPT Machinery]
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
 *           default: Tdn
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: Tdn
 *         schema:
 *           type: string
 *         description: Filter by TDN
 *       - in: query
 *         name: KIND
 *         schema:
 *           type: string
 *         description: Filter by Kind
 *       - in: query
 *         name: Classification
 *         schema:
 *           type: string
 *         description: Filter by Classification
 *       - in: query
 *         name: MachineDesc
 *         schema:
 *           type: string
 *         description: Filter by Machine Description (Partial Match)
 *     responses:
 *       200:
 *         description: List of machinery records
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
 *                     $ref: '#/components/schemas/RptMach'
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
router.get('/', rptMachController.getAll.bind(rptMachController));

/**
 * @swagger
 * /api/v1/rpt-mach/{tdn}:
 *   get:
 *     summary: Get machinery records by TDN
 *     tags: [RPT Machinery]
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *         description: Tax Declaration Number
 *     responses:
 *       200:
 *         description: Machinery records details
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
 *                     $ref: '#/components/schemas/RptMach'
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
router.get('/:tdn', rptMachController.getByTdn.bind(rptMachController));

module.exports = router;
