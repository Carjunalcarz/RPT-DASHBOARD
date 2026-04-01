const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @swagger
 * /health/mssql:
 *   get:
 *     summary: Check MSSQL database health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: MSSQL is healthy
 *       500:
 *         description: MSSQL is unhealthy
 */
router.get('/mssql', healthController.checkMssql);

/**
 * @swagger
 * /health/supabase:
 *   get:
 *     summary: Check Supabase database health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Supabase is healthy
 *       500:
 *         description: Supabase is unhealthy
 */
router.get('/supabase', healthController.checkSupabase);

module.exports = router;
