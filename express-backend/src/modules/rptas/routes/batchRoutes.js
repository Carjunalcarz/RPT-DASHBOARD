const express = require('express');
const { updateTaskAndItem } = require('../controllers/batchController');
const protect = require('../../../middleware/auth');
const validate = require('../../../middleware/validate');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/batch/update-task-item:
 *   put:
 *     summary: Simultaneously update a Task and an Item
 *     tags: [Batch]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - itemId
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [mssql, supabase]
 *                 default: supabase
 *               taskId:
 *                 type: integer
 *               taskData:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   status:
 *                     type: string
 *               itemId:
 *                 type: integer
 *               itemData:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *     responses:
 *       200:
 *         description: Both entities updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Task or Item not found
 *       500:
 *         description: Transaction failed
 */
router.put(
  '/update-task-item',
  protect,
  validate([
    body('taskId').isInt().withMessage('Task ID must be an integer'),
    body('itemId').isInt().withMessage('Item ID must be an integer'),
    body('source').optional().isIn(['mssql', 'supabase']),
    body('taskData').optional().isObject(),
    body('itemData').optional().isObject()
  ]),
  updateTaskAndItem
);

module.exports = router;
