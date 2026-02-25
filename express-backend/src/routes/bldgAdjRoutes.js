const express = require('express');
const { body, param, query } = require('express-validator');
const bldgAdjController = require('../controllers/bldgAdjController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: BLDG_ADJ
 *   description: Building Adjustment Management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BldgAdjRecord:
 *       type: object
 *       properties:
 *         TDN:
 *           type: string
 *         SeqNo:
 *           type: string
 *         Region:
 *           type: string
 *         Prov:
 *           type: string
 *         City:
 *           type: string
 *         DISTRICT:
 *           type: string
 *         KIND:
 *           type: string
 *         Classification:
 *           type: string
 *         Actual_use:
 *           type: string
 *         Market_Val:
 *           type: number
 */

// Validation Rules
const createValidation = [
  body('TDN').notEmpty().withMessage('TDN is required'),
  body('SeqNo').notEmpty().withMessage('SeqNo is required'),
  body('Region').notEmpty().withMessage('Region is required'),
  body('Prov').notEmpty().withMessage('Prov is required'),
  body('City').notEmpty().withMessage('City is required'),
  body('DISTRICT').notEmpty().withMessage('DISTRICT is required'),
  body('KIND').notEmpty().withMessage('KIND is required'),
  body('Classification').notEmpty().withMessage('Classification is required'),
  body('Actual_use').notEmpty().withMessage('Actual_use is required'),
  body('SubClass').optional(),
  body('Struc_Type').optional(),
  body('BldgCode').optional(),
  body('Storey').optional(),
  body('MainComp').optional(),
  body('CompExtn').optional(),
  body('DescNote').optional(),
  body('Area').optional().isNumeric(),
  body('AdditionalArea').optional().isNumeric(),
  body('UnitCost').optional().isNumeric(),
  body('BaseVal').optional().isNumeric(),
  body('PercentCost').optional().isNumeric(),
  body('Market_Val').isNumeric().withMessage('Market_Val must be a number'),
  body('Dep_Rate').optional().isNumeric(),
  body('Acc_Dep').optional().isNumeric(),
  body('Sub_total').optional().isNumeric(),
  body('Additional').optional().isNumeric(),
  body('ISADDITIONAL').optional().isBoolean(),
  body('FloorOrd').optional(),
  body('Sub_Tdn').optional(),
  body('PercentComp').optional().isNumeric()
];

const updateValidation = [
  param('tdn').notEmpty().withMessage('TDN parameter is required'),
  param('seqNo').notEmpty().withMessage('SeqNo parameter is required'),
  body('Market_Val').optional().isNumeric(),
  // Add other fields as optional
];

/**
 * @swagger
 * /api/bldg-adj:
 *   get:
 *     summary: Retrieve all BLDG_ADJ records
 *     tags: [BLDG_ADJ]
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
 *           default: 20
 *       - in: query
 *         name: TDN
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of records
 */
router.get('/', protect, bldgAdjController.getAll);

/**
 * @swagger
 * /api/bldg-adj/{tdn}:
 *   get:
 *     summary: Get records by TDN
 *     tags: [BLDG_ADJ]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Record details
 */
router.get('/:tdn', protect, bldgAdjController.getByTdn);

/**
 * @swagger
 * /api/bldg-adj:
 *   post:
 *     summary: Create a new BLDG_ADJ record
 *     tags: [BLDG_ADJ]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BldgAdjRecord'
 *     responses:
 *       201:
 *         description: Created successfully
 */
router.post('/', protect, validate(createValidation), bldgAdjController.create);

/**
 * @swagger
 * /api/bldg-adj/{tdn}/{seqNo}:
 *   put:
 *     summary: Update an existing record
 *     tags: [BLDG_ADJ]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seqNo
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BldgAdjRecord'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put('/:tdn/:seqNo', protect, validate(updateValidation), bldgAdjController.update);

/**
 * @swagger
 * /api/bldg-adj/{tdn}/{seqNo}:
 *   delete:
 *     summary: Delete a record
 *     tags: [BLDG_ADJ]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: seqNo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:tdn/:seqNo', protect, bldgAdjController.delete);

module.exports = router;
