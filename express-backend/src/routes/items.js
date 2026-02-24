const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const itemController = require('../controllers/itemController');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       required:
 *         - name
 *         - source
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the item
 *         name:
 *           type: string
 *           description: The name of the item
 *         source:
 *           type: string
 *           enum: [supabase, mssql]
 *           default: supabase
 *           example: supabase
 *           description: Which database to use
 */

/**
 * @swagger
 * /api/v1/items:
 *   get:
 *     summary: Returns the list of all items from both DBs (or filtered)
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [mssql, supabase]
 *         description: Filter by source
 *     responses:
 *       200:
 *         description: The list of the items
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Item'
 *     responses:
 *       201:
 *         description: The created item
 */
router.get('/', protect, itemController.getAllItems);

router.post(
  '/',
  protect,
  validate([
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('source').optional().isIn(['mssql', 'supabase']).withMessage('Source must be mssql or supabase')
  ]),
  itemController.createItem
);

router.get(
  '/:id',
  protect,
  validate([
    param('id').isInt().withMessage('ID must be an integer'),
    // Note: If using UUID for Supabase, this validation needs adjustment based on source
  ]),
  itemController.getItem
);

router.put(
  '/:id',
  protect,
  validate([
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('source').optional().isIn(['mssql', 'supabase']).withMessage('Source must be mssql or supabase')
  ]),
  itemController.updateItem
);

router.delete(
  '/:id',
  protect,
  validate([
    param('id').isInt()
  ]),
  itemController.deleteItem
);

module.exports = router;
