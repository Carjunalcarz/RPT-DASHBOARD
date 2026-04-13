const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: City
 *   description: City/Municipality records management (MSSQL)
 */

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Retrieve a paginated list of cities/municipalities
 *     description: Fetches city records from the MSSQL dbo.CITY table with pagination and optional search
 *     tags: [City]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 100
 *         description: The number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by city name (DESCRIPTION) or CODE
 *     responses:
 *       200:
 *         description: A paginated list of cities
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
 *                     type: object
 *                     properties:
 *                       CODE:
 *                         type: string
 *                         example: "01"
 *                       DESCRIPTION:
 *                         type: string
 *                         example: "BUTUAN CITY"
 *                       PROV:
 *                         type: string
 *                         example: "053"
 *                       REGION:
 *                         type: string
 *                         example: "XIII"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 100
 *                     total:
 *                       type: integer
 *                       example: 12
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Invalid pagination parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token/API key
 *       500:
 *         description: Internal server error
 */
router.get('/', protect, (req, res, next) => cityController.getCities(req, res, next));

module.exports = router;