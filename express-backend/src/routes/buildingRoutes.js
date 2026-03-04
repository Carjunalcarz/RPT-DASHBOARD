const express = require('express');
const router = express.Router();
const buildingController = require('../controllers/buildingController');
const protect = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Building types and market values management
 */

/**
 * @swagger
 * /api/v1/buildings/types:
 *   get:
 *     summary: Get all building types
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all building types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                         example: "RES"
 *                       name:
 *                         type: string
 *                         example: "RESIDENTIAL BUILDING"
 *                       description:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get('/types', protect, buildingController.getAllBuildingTypes);

/**
 * @swagger
 * /api/v1/buildings/market-values:
 *   get:
 *     summary: Get building market values
 *     tags: [Buildings]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: buildingTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by Building Type ID
 *       - in: query
 *         name: buildingTypeCode
 *         schema:
 *           type: string
 *         description: Filter by Building Type Code (e.g. RES, COM)
 *       - in: query
 *         name: ordinanceNo
 *         schema:
 *           type: string
 *         description: Filter by Ordinance Number
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
 *           default: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of building market values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       ordinanceNo:
 *                         type: string
 *                         example: "6th GR SP 2025"
 *                       effectivityDate:
 *                         type: string
 *                         format: date
 *                       structureClass:
 *                         type: string
 *                         example: "V"
 *                       subClass:
 *                         type: string
 *                         example: "A"
 *                       unitValue:
 *                         type: number
 *                         format: float
 *                         example: 10890.00
 *                       buildingType:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
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
 *       500:
 *         description: Server error
 */
router.get('/market-values', protect, buildingController.getMarketValues);

module.exports = router;
