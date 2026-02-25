const express = require('express');
const { body, param, query } = require('express-validator');
const bldgStrucController = require('../controllers/bldgStrucController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: BLDG_STRUC
 *   description: Building Structure/Floor Management
 */

// Validation Rules
const createValidation = [
  body('TDN').notEmpty().withMessage('TDN is required'),
  body('Region').notEmpty(),
  body('Prov').notEmpty(),
  body('City').notEmpty(),
  body('DISTRICT').notEmpty(),
  body('FloorOrd').notEmpty().isInt(),
  body('Floor_area').optional().isNumeric(),
  body('Total_Area').optional().isNumeric(),
  body('UNIT_VALUE').optional().isNumeric(),
  body('Market_Val').optional().isNumeric(),
  // Add other fields validation as needed
];

const updateValidation = [
  param('tdn').notEmpty(),
  param('floorOrd').notEmpty().isInt(),
  body('Floor_area').optional().isNumeric(),
  body('Market_Val').optional().isNumeric(),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     BldgStrucRecord:
 *       type: object
 *       properties:
 *         Region:
 *           type: string
 *         Prov:
 *           type: string
 *         City:
 *           type: string
 *         DISTRICT:
 *           type: string
 *         TDN:
 *           type: string
 *         KIND:
 *           type: string
 *         Classification:
 *           type: string
 *         Actual_use:
 *           type: string
 *         FloorOrd:
 *           type: integer
 *         Floor_area:
 *           type: number
 *         Market_Val:
 *           type: number
 *     BldgStrucResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         count:
 *           type: integer
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BldgStrucRecord'
 */

/**
 * @swagger
 * /api/bldg-struc:
 *   get:
 *     summary: Retrieve all BLDG_STRUC records
 *     tags: [BLDG_STRUC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: TDN
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BldgStrucResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
router.get('/', protect, bldgStrucController.getAll);

/**
 * @swagger
 * /api/bldg-struc/{tdn}:
 *   get:
 *     summary: Get records by TDN
 *     tags: [BLDG_STRUC]
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
 *         description: Successful retrieval
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BldgStrucResponse'
 *       404:
 *         description: Not Found
 *       500:
 *         description: Server Error
 */
router.get('/:tdn', protect, bldgStrucController.getByTdn);

/**
 * @swagger
 * /api/bldg-struc:
 *   post:
 *     summary: Create a new BLDG_STRUC record
 *     tags: [BLDG_STRUC]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BldgStrucRecord'
 *     responses:
 *       201:
 *         description: Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BldgStrucRecord'
 *       400:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post('/', protect, validate(createValidation), bldgStrucController.create);

/**
 * @swagger
 * /api/bldg-struc/{tdn}/{floorOrd}:
 *   put:
 *     summary: Update an existing record
 *     tags: [BLDG_STRUC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: floorOrd
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BldgStrucRecord'
 *     responses:
 *       200:
 *         description: Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BldgStrucRecord'
 *       404:
 *         description: Not Found
 *       500:
 *         description: Server Error
 */
router.put('/:tdn/:floorOrd', protect, validate(updateValidation), bldgStrucController.update);

/**
 * @swagger
 * /api/bldg-struc/{tdn}/{floorOrd}:
 *   delete:
 *     summary: Delete a record
 *     tags: [BLDG_STRUC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: tdn
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: floorOrd
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Not Found
 *       500:
 *         description: Server Error
 */
router.delete('/:tdn/:floorOrd', protect, bldgStrucController.delete);

module.exports = router;
