const express = require('express');
const router = express.Router();
const barangayController = require('../controllers/barangayController');
const protect = require('../../../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     BarangayRecord:
 *       type: object
 *       description: A barangay record from the MSSQL database
 *       properties:
 *         BGY_CODE:
 *           type: string
 *           description: The unique code of the barangay
 *           example: "001"
 *         BGY_NAME:
 *           type: string
 *           description: The name of the barangay
 *           example: "Barangay 1"
 *         DISTRICT:
 *           type: string
 *           description: The district the barangay belongs to
 *           example: "1"
 *         CITY:
 *           type: string
 *           description: The city the barangay belongs to
 *           example: "Manila"
 *         PROV:
 *           type: string
 *           description: The province the barangay belongs to
 *           example: "Metro Manila"
 *         REGION:
 *           type: string
 *           description: The region the barangay belongs to
 *           example: "NCR"
 *     
 *     BarangayResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         message:
 *           type: string
 *           example: "Barangay records retrieved successfully"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BarangayRecord'
 *         metadata:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             pageSize:
 *               type: integer
 *               example: 100
 *             total:
 *               type: integer
 *               example: 50
 *             totalPages:
 *               type: integer
 *               example: 1
 *             timestamp:
 *               type: string
 *               format: date-time
 *               example: "2023-10-25T10:00:00Z"
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         message:
 *           type: string
 *           example: "An error occurred"
 */

/**
 * @swagger
 * /api/barangays:
 *   get:
 *     summary: Retrieve all barangay records
 *     description: Fetches a paginated list of all barangay records from the MSSQL database.
 *     tags: [Barangay]
 *     security:
 *       - cookieAuth: []
 *       - ApiKeyAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: The page number to retrieve
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *         description: The number of records to retrieve per page
 *     responses:
 *       200:
 *         description: A successful response returning an array of barangay records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BarangayResponse'
 *       404:
 *         description: No barangay records found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server or database connection error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', protect, (req, res, next) => barangayController.getBarangays(req, res, next));

module.exports = router;
