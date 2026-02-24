const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const auditController = require('../controllers/auditController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         tableName:
 *           type: string
 *         recordId:
 *           type: string
 *         action:
 *           type: string
 *         userId:
 *           type: string
 *         ipAddress:
 *           type: string
 *         timestamp:
 *           type: string
 *           format: date-time
 *         details:
 *           type: object
 *         oldValues:
 *           type: object
 *         newValues:
 *           type: object
 */

/**
 * @swagger
 * /api/v1/audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [mssql, supabase]
 *         description: "Database source (default: supabase)"
 *       - in: query
 *         name: tableName
 *         schema:
 *           type: string
 *         description: Filter by table name
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action (CREATE, UPDATE, DELETE)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO 8601)
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
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 source:
 *                   type: string
 *                 results:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  protect,
  validate([
    query('source').optional().isIn(['mssql', 'supabase']).withMessage('Invalid source'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be greater than 0'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ]),
  auditController.getAuditLogs
);

module.exports = router;
