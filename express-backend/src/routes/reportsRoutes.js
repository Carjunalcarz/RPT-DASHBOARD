const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/supabase-client-v5');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const protect = require('../middleware/auth');

/**
 * @swagger
 * /api/v1/reports/properties:
 *   get:
 *     summary: Get comprehensive property report
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: municipality
 *         schema:
 *           type: string
 *         description: Filter by municipality name
 *       - in: query
 *         name: barangay
 *         schema:
 *           type: string
 *         description: Filter by barangay name
 *       - in: query
 *         name: taxBegYr
 *         schema:
 *           type: string
 *         description: Filter by Tax Beginning Year
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
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Paginated list of individual assessment records
 */
router.get('/properties', protect, async (req, res) => {
  try {
    const { municipality, barangay, taxBegYr } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause dynamically
    let whereClause = '1=1';
    const params = [];

    if (municipality) {
      whereClause += ` AND rp.municipality_name_snapshot ILIKE $${params.length + 1}`;
      params.push(`%${municipality}%`);
    }

    if (barangay) {
      whereClause += ` AND rp.barangay_name_snapshot ILIKE $${params.length + 1}`;
      params.push(`%${barangay}%`);
    }

    if (taxBegYr) {
      whereClause += ` AND rp.tax_beg_yr = $${params.length + 1}`;
      params.push(taxBegYr);
    }

    // Get total count of assessments for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM rpt_assessment ra
      JOIN rpt_property rp ON ra.property_id = rp.id
      WHERE ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const totalCount = Number(countResult[0].count);

    // Raw SQL to fetch individual assessments joined with property info
    const query = `
      SELECT 
        ra.id as "assessmentId",
        ra.kind,
        ra.ass_level as "assLevel",
        ra.taxability,
        ra.classification,
        ra.subclass,
        ra.area,
        ra.measurement,
        ra.market_value as "marketValue",
        ra.ass_value as "assValue",
        rp.id as "propertyId",
        rp.pin, 
        rp.tdn, 
        rp.owner_name_snapshot as "ownerName", 
        rp.municipality_name_snapshot as "municipality", 
        rp.barangay_name_snapshot as "barangay", 
        rp.muncode,
        rp.bcode,
        rp.tax_beg_yr as "taxBegYr",
        rp.trans_code as "transCode",
        rp.tax_beg_yr as "taxYear"
      FROM rpt_assessment ra
      JOIN rpt_property rp ON ra.property_id = rp.id
      WHERE ${whereClause}
      ORDER BY rp.created_at DESC, ra.id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const results = await prisma.$queryRawUnsafe(query, ...params, limit, offset);

    const serializedResults = results.map(row => ({
      ...row,
      assLevel: Number(row.assLevel),
      area: Number(row.area),
      marketValue: Number(row.marketValue),
      assValue: Number(row.assValue)
    }));

    res.json({
      data: serializedResults,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    logger.error(`Error fetching property report: ${error.message}`);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * @swagger
 * /api/v1/reports/tax-beg-years:
 *   get:
 *     summary: Get distinct tax beginning years for reports filters
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Distinct list of tax beginning years
 */
router.get('/tax-beg-years', protect, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT tax_beg_yr as "taxBegYr"
      FROM rpt_property
      WHERE tax_beg_yr IS NOT NULL
        AND tax_beg_yr <> ''
        AND tax_beg_yr ~ '^\\d{4}$'
      ORDER BY tax_beg_yr DESC
    `;
    const result = await prisma.$queryRawUnsafe(query);
    res.json(result.map(r => r.taxBegYr));
  } catch (error) {
    logger.error(`Error fetching tax beg years: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tax beginning years' });
  }
});

/**
 * @swagger
 * /api/v1/reports/summary:
 *   get:
 *     summary: Get aggregate summary statistics
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: municipality
 *         schema:
 *           type: string
 *         description: Filter by municipality name
 *       - in: query
 *         name: barangay
 *         schema:
 *           type: string
 *         description: Filter by barangay name
 *       - in: query
 *         name: taxBegYr
 *         schema:
 *           type: string
 *         description: Filter by Tax Beginning Year
 *     responses:
 *       200:
 *         description: Summary statistics
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const { municipality, barangay, taxBegYr } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (municipality) {
      whereClause += ` AND rp.municipality_name_snapshot ILIKE $${params.length + 1}`;
      params.push(`%${municipality}%`);
    }

    if (barangay) {
      whereClause += ` AND rp.barangay_name_snapshot ILIKE $${params.length + 1}`;
      params.push(`%${barangay}%`);
    }

    if (taxBegYr) {
      whereClause += ` AND rp.tax_beg_yr = $${params.length + 1}`;
      params.push(taxBegYr);
    }

    const summaryQuery = `
      SELECT
        COUNT(DISTINCT rp.id) as "totalProperties",
        COALESCE(SUM(ra.market_value), 0) as "totalMarketValue",
        COALESCE(SUM(ra.ass_value), 0) as "totalAssessedValue",
        COUNT(DISTINCT rp.source_record_id) as "approvedFaasCount"
      FROM rpt_property rp
      LEFT JOIN rpt_assessment ra ON ra.property_id = rp.id
      WHERE ${whereClause}
    `;

    const result = await prisma.$queryRawUnsafe(summaryQuery, ...params);
    
    const summary = result[0] ? {
      totalProperties: Number(result[0].totalProperties),
      totalMarketValue: Number(result[0].totalMarketValue),
      totalAssessedValue: Number(result[0].totalAssessedValue),
      approvedFaasCount: Number(result[0].approvedFaasCount)
    } : {
      totalProperties: 0,
      totalMarketValue: 0,
      totalAssessedValue: 0,
      approvedFaasCount: 0
    };

    res.json(summary);
  } catch (error) {
    logger.error(`Error fetching report summary: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
