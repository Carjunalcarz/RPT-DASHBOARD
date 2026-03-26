const { Router } = require('express');
const { body, param, query } = require('express-validator');
const protect = require('../../../middleware/auth');
const validate = require('../../../middleware/validate');

function createAssessmentRoutes({ assessmentController }) {
  const router = Router();

/**
 * @swagger
 * tags:
 *   name: RPT_ASS
 *   description: Real Property Tax Assessment Management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RptAssRecord:
 *       type: object
 *       properties:
 *         TDN:
 *           type: string
 *         REGION:
 *           type: string
 *         PROV:
 *           type: string
 *         CITY:
 *           type: string
 *         DISTRICT:
 *           type: string
 *         KIND:
 *           type: string
 *         CLASSIFICATION:
 *           type: string
 *         ACTUAL_USE:
 *           type: string
 *         MARKET_VAL:
 *           type: number
 *         ASS_VALUE:
 *           type: number
 */

// Validation Rules
const createValidation = [
  body('TDN').notEmpty().withMessage('TDN is required'),
  body('REGION').notEmpty().withMessage('REGION is required'),
  body('PROV').notEmpty().withMessage('PROV is required'),
  body('CITY').notEmpty().withMessage('CITY is required'),
  body('DISTRICT').optional(),
  body('KIND').notEmpty().withMessage('KIND is required'),
  body('CLASSIFICATION').notEmpty().withMessage('CLASSIFICATION is required'),
  body('ACTUAL_USE').optional(),
  body('SUB_CLASS').optional(),
  body('EFF_DATE').optional().isISO8601().toDate(),
  body('FOR_YEAR').isInt().withMessage('FOR_YEAR must be an integer'),
  body('AREA').optional().isNumeric(),
  body('IF_DEFAULT').optional(),
  body('UNIT_VALUE').optional().isNumeric(),
  body('MARKET_VAL').isNumeric().withMessage('MARKET_VAL must be a number'),
  body('OLD_MVAL').optional().isNumeric(),
  body('ASS_LEVEL').optional().isNumeric(),
  body('TAXABLE_RATE').optional().isNumeric(),
  body('ASS_VALUE').isNumeric().withMessage('ASS_VALUE must be a number'),
  body('TAXABILITY').optional(),
  body('BU').optional(),
  body('SQAREA').optional().isNumeric(),
  body('IdleLand').optional(),
  body('LinearUnit').optional(),
  body('LegalBasis').optional(),
  body('ISGREATERAREA').optional(),
  body('ISGREATERAREA_WAU').optional(),
  body('Length').optional().isNumeric(),
  body('sqDecimeter').optional().isNumeric(),
  body('Sub_Tdn').optional(),
  body('LAND_DESC').optional(),
  body('Disposal_Mvalue').optional().isNumeric(),
  body('WIDTH').optional().isNumeric(),
  body('TOTALDIRECTCOST').optional().isNumeric(),
  body('ACTUALCUT').optional(),
  body('MVALTIMBER').optional().isNumeric(),
  body('AREACOVERED').optional().isNumeric(),
  body('TOTALCONS').optional().isNumeric(),
  body('AREACOVEREDMUN').optional().isNumeric(),
  body('PERCENTAREA').optional().isNumeric(),
  body('MARKETVALMUN').optional().isNumeric(),
  body('IDLE_DECDATE').optional().isISO8601().toDate(),
  body('IDLE_DATEEFF').optional().isISO8601().toDate(),
  body('IDLE_UNLISTED').optional(),
  body('IDLE_USERNAME').optional(),
  body('DIRECTLOGCOST').optional().isNumeric(),
  body('DOMEPRICELOG').optional().isNumeric()
];

const updateValidation = [
  param('id').notEmpty().withMessage('ID parameter is required'),
  body('TDN').optional(), // Should not typically change PK
  body('MARKET_VAL').optional().isNumeric(),
  body('ASS_VALUE').optional().isNumeric(),
  // ... other fields
];

/**
 * @swagger
 * /api/rpt-ass:
 *   get:
 *     summary: Retrieve all RPT_ASS records
 *     tags: [RPT_ASS]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: TDN
 *         schema:
 *           type: string
 *         description: Filter by TDN
 *     responses:
 *       200:
 *         description: List of records
 */
router.get('/', protect, (req, res, next) => assessmentController.getAll(req, res, next));

/**
 * @swagger
 * /api/rpt-ass/{id}:
 *   get:
 *     summary: Get a single record by TDN
 *     tags: [RPT_ASS]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record details
 *       404:
 *         description: Not found
 */
router.get('/:id', protect, assessmentController.getById);

/**
 * @swagger
 * /api/rpt-ass:
 *   post:
 *     summary: Create a new RPT_ASS record
 *     tags: [RPT_ASS]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RptAssRecord'
 *     responses:
 *       201:
 *         description: Created successfully
 */
router.post('/', protect, validate(createValidation), (req, res, next) => assessmentController.create(req, res, next));

/**
 * @swagger
 * /api/rpt-ass/{id}:
 *   put:
 *     summary: Update an existing record
 *     tags: [RPT_ASS]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RptAssRecord'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put('/:id', protect, validate(updateValidation), (req, res, next) => assessmentController.update(req, res, next));

/**
 * @swagger
 * /api/rpt-ass/{id}:
 *   delete:
 *     summary: Soft delete a record
 *     tags: [RPT_ASS]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', protect, (req, res, next) => assessmentController.delete(req, res, next));

  return router;
}

module.exports = createAssessmentRoutes;
