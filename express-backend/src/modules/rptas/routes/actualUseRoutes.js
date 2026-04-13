const express = require('express');
const router = express.Router();
const actualUseController = require('../controllers/actualUseController');
const actualUseCustomController = require('../controllers/actualUseCustomController');
const protect = require('../../../middleware/auth');

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

/**
 * @swagger
 * tags:
 *   name: ActualUse
 *   description: Actual Use records management (MSSQL)
 */

/**
 * @swagger
 * /api/v1/actual-uses:
 *   get:
 *     summary: Retrieve a paginated list of actual uses
 *     description: Fetches actual use records from the MSSQL dbo.ACTUALUSE table with pagination and optional search
 *     tags: [ActualUse]
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by description or code
 *       - in: query
 *         name: mainClass
 *         schema:
 *           type: string
 *         description: Filter by MainClass code
 *     responses:
 *       200:
 *         description: A paginated list of actual uses
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', protect, (req, res, next) => actualUseController.getAll(req, res, next));

router.get('/custom', protect, (req, res, next) => actualUseCustomController.list(req, res, next));
router.post('/custom', protect, (req, res, next) => actualUseCustomController.upsert(req, res, next));
router.delete('/custom/:id', protect, (req, res, next) => actualUseCustomController.delete(req, res, next));

module.exports = router;
