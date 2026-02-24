const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const testTaskController = require('../controllers/testTaskController');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     TestTask:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *         dueDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/test-tasks:
 *   post:
 *     summary: Create a new test task
 *     tags: [Test Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *         source:
 *           type: string
 *           enum: [supabase, mssql]
 *           default: supabase
 *           example: supabase
 *     responses:
 *       201:
 *         description: Task created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestTask'
 *   get:
 *     summary: Retrieve all test tasks
 *     tags: [Test Tasks]
 *     security:
 *       - bearerAuth: []
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
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [mssql, supabase]
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.route('/')
  .post(
    protect,
    validate([
      body('title').isString().trim().isLength({ max: 255 }).notEmpty().withMessage('Title is required and max 255 chars'),
      body('description').optional().isString(),
      body('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status'),
      body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
      body('dueDate').optional().isISO8601().toDate().withMessage('Invalid date format'),
      body('source').optional().isIn(['mssql', 'supabase'])
    ]),
    testTaskController.createTask
  )
  .get(
    protect,
    validate([
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('status').optional().isString(),
      query('priority').optional().isString(),
      query('source').optional().isIn(['mssql', 'supabase'])
    ]),
    testTaskController.getTasks
  );

/**
 * @swagger
 * /api/v1/test-tasks/{id}:
 *   get:
 *     summary: Retrieve a specific test task
 *     tags: [Test Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [mssql, supabase]
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 *   put:
 *     summary: Update a test task
 *     tags: [Test Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TestTask'
 *     responses:
 *       200:
 *         description: Task updated
 *   delete:
 *     summary: Delete a test task (soft delete)
 *     tags: [Test Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [mssql, supabase]
 *     responses:
 *       204:
 *         description: Task deleted
 */
router.route('/:id')
  .get(
    protect,
    validate([
      param('id').isInt().withMessage('ID must be an integer'),
      query('source').optional().isIn(['mssql', 'supabase'])
    ]),
    testTaskController.getTask
  )
  .put(
    protect,
    validate([
      param('id').isInt().withMessage('ID must be an integer'),
      body('title').optional().isString().trim().isLength({ max: 255 }),
      body('description').optional().isString(),
      body('status').optional().isIn(['pending', 'in-progress', 'completed']),
      body('priority').optional().isIn(['low', 'medium', 'high']),
      body('dueDate').optional().isISO8601().toDate(),
      body('source').optional().isIn(['mssql', 'supabase']),
      query('source').optional().isIn(['mssql', 'supabase'])
    ]),
    testTaskController.updateTask
  )
  .patch(
    protect,
    validate([
      param('id').isInt().withMessage('ID must be an integer'),
      body('title').optional().isString().trim().isLength({ max: 255 }),
      body('description').optional().isString(),
      body('status').optional().isIn(['pending', 'in-progress', 'completed']),
      body('priority').optional().isIn(['low', 'medium', 'high']),
      body('dueDate').optional().isISO8601().toDate(),
      body('source').optional().isIn(['mssql', 'supabase']),
      query('source').optional().isIn(['mssql', 'supabase'])
    ]),
    testTaskController.updateTask
  )
  .delete(
    protect,
    validate([
      param('id').isInt().withMessage('ID must be an integer'),
      query('source').optional().isIn(['mssql', 'supabase'])
    ]),
    testTaskController.deleteTask
  );

module.exports = router;
