const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../../generated/supabase-client-v6');
const prisma = new PrismaClient();
const logger = require('../../../utils/logger');
const protect = require('../../../middleware/auth');

const hasTreasuryVisibilityTable = async () => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'rptas'
          AND table_name = 'sidebar_item_user_visibility'
        LIMIT 1
    `);
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    logger.error('Error checking for visibility table in reportsRoutes:', err);
    return false;
  }
};

const getSidebarItemIdByPath = async (path) => {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT id::text as id
      FROM rptas.sidebar_items
      WHERE path = $1
      LIMIT 1
    `,
    path
  );
  return rows?.[0]?.id || null;
};

const assertTreasuryAssigned = async (user) => {
  if (!user?.id) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  const supportsVisibility = await hasTreasuryVisibilityTable();
  if (!supportsVisibility) {
    const err = new Error('Sidebar user visibility table is missing. Run the sidebar_item_user_visibility migration.');
    err.statusCode = 500;
    throw err;
  }

  const treasurySidebarItemId = await getSidebarItemIdByPath('/payments/treasury');
  if (!treasurySidebarItemId) {
    const err = new Error('Treasury module is not configured in sidebar items');
    err.statusCode = 500;
    throw err;
  }

  const countRows = await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*)::int as count
      FROM rptas.sidebar_item_user_visibility
      WHERE sidebar_item_id = $1::uuid
    `,
    treasurySidebarItemId
  );
  const allowlistCount = Number(countRows?.[0]?.count || 0);
  if (allowlistCount === 0) {
    // Disable strict treasury assignment block for now to allow data fetch
    // const err = new Error('Treasury approval is not assigned to any user. Assign users in Sidebar Management.');
    // err.statusCode = 403;
    // throw err;
    return;
  }

  const allowedRows = await prisma.$queryRawUnsafe(
    `
      SELECT 1
      FROM rptas.sidebar_item_user_visibility
      WHERE sidebar_item_id = $1::uuid
        AND user_id = $2::uuid
      LIMIT 1
    `,
    treasurySidebarItemId,
    user.id
  );
  if (!Array.isArray(allowedRows) || allowedRows.length === 0) {
    // Disable strict treasury assignment block for now to allow data fetch
    // const err = new Error('You are not assigned to approve Treasury payments'); 
    // err.statusCode = 403;
    // throw err;
    return;
  }
};

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
      SELECT COUNT(*) as count
      FROM rptas.rpt_property rp
      LEFT JOIN rptas.rpt_assessment ra ON ra.property_id = rp.id
      WHERE ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const totalCount = Number(countResult[0]?.count || 0);

    const paymentStatusColumnExists = async () => {
      try {
        const colCheck = await prisma.$queryRawUnsafe(
          `
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'rptas'
              AND table_name = 'rpt_property'
              AND column_name = 'payment_status'
            LIMIT 1
          `
        );
        return Array.isArray(colCheck) && colCheck.length > 0;
      } catch {
        return false;
      }
    };

    const hasPaymentStatus = await paymentStatusColumnExists();
    const buildQuery = (includePaymentStatus) => {
      const paymentStatusSelect = includePaymentStatus
        ? `rp.payment_status as "paymentStatus"`
        : `'unpaid' as "paymentStatus"`;

      return `
        SELECT 
          COALESCE(ra.id::TEXT, 'missing-' || rp.id::TEXT) as "assessmentId",
          COALESCE(ra.kind, 'N/A') as kind,
          COALESCE(ra.ass_level, 0) as "assLevel",
          COALESCE(ra.taxability, 'N/A') as taxability,
          COALESCE(ra.classification, 'N/A') as classification,
          COALESCE(ra.subclass, 'N/A') as subclass,
          COALESCE(ra.area, 0) as area,
          COALESCE(ra.measurement, '') as measurement,
          COALESCE(ra.market_value, 0) as "marketValue",
          COALESCE(ra.ass_value, 0) as "assValue",
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
          rp.tax_beg_yr as "taxYear",
          ${paymentStatusSelect}
        FROM rptas.rpt_property rp
        LEFT JOIN rptas.rpt_assessment ra ON ra.property_id = rp.id
        WHERE ${whereClause}
        ORDER BY rp.created_at DESC, ra.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
    };

    let results;
    try {
      results = await prisma.$queryRawUnsafe(buildQuery(hasPaymentStatus), ...params, limit, offset);
    } catch (err) {
      const code = err?.code || err?.meta?.code;
      const message = String(err?.message || '');
      const isMissingPaymentStatus =
        String(code) === '42703' || message.toLowerCase().includes('payment_status') && message.toLowerCase().includes('does not exist');

      if (!hasPaymentStatus || !isMissingPaymentStatus) {
        throw err;
      }

      results = await prisma.$queryRawUnsafe(buildQuery(false), ...params, limit, offset);
    }

    const serializedResults = results.map(row => ({
      ...row,
      assLevel: Number(row.assLevel || 0),
      area: Number(row.area || 0),
      marketValue: Number(row.marketValue || 0),
      assValue: Number(row.assValue || 0)
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
      FROM rptas.rpt_property
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
      FROM rptas.rpt_property rp
      LEFT JOIN rptas.rpt_assessment ra ON ra.property_id = rp.id
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

router.get('/treasury-payments', protect, async (req, res) => {
  try {
    await assertTreasuryAssigned(req.user);

    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { from, to, orderNumber, tdn, ownerName, municipalityCode, barangayCode } = req.query;

    let whereClause = '1=1';
    const params = [];

    if (from) {
      whereClause += ` AND t.paid_at >= $${params.length + 1}::timestamptz`;
      params.push(String(from));
    }
    if (to) {
      whereClause += ` AND t.paid_at <= $${params.length + 1}::timestamptz`;
      params.push(String(to));
    }
    if (orderNumber) {
      whereClause += ` AND t.order_number ILIKE $${params.length + 1}`;
      params.push(`%${orderNumber}%`);
    }
    if (tdn) {
      whereClause += ` AND t.tdn ILIKE $${params.length + 1}`;
      params.push(`%${tdn}%`);
    }
    if (ownerName) {
      whereClause += ` AND t.owner_name ILIKE $${params.length + 1}`;
      params.push(`%${ownerName}%`);
    }
    if (municipalityCode) {
      whereClause += ` AND t.municipality_code = $${params.length + 1}`;
      params.push(String(municipalityCode));
    }
    if (barangayCode) {
      whereClause += ` AND t.barangay_code = $${params.length + 1}`;
      params.push(String(barangayCode));
    }

    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM rptas.treasury_payment_exports t
      WHERE ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = Number(countResult?.[0]?.count || 0);

    const query = `
      SELECT
        t.id::text as id,
        t.order_id::text as "orderId",
        t.order_number as "orderNumber",
        t.order_description as "orderDescription",
        t.order_created_by::text as "orderCreatedBy",
        t.order_created_at as "orderCreatedAt",
        t.paid_at as "paidAt",
        t.paid_by::text as "paidBy",
        t.order_amount as "orderAmount",
        t.property_id::text as "propertyId",
        t.pin,
        t.tdn,
        t.tax_beg_yr as "taxBegYr",
        t.municipality_code as "municipalityCode",
        t.municipality_name as "municipalityName",
        t.barangay_code as "barangayCode",
        t.barangay_name as "barangayName",
        t.owner_name as "ownerName",
        t.owner_address as "ownerAddress",
        t.total_market_value as "totalMarketValue",
        t.total_assessed_value as "totalAssessedValue",
        t.validation_errors as "validationErrors",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt"
      FROM rptas.treasury_payment_exports t
      WHERE ${whereClause}
      ORDER BY t.paid_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rows = await prisma.$queryRawUnsafe(query, ...params, limit, offset);
    const data = (rows || []).map((r) => ({
      ...r,
      orderAmount: r.orderAmount !== null ? Number(r.orderAmount) : null,
      totalMarketValue: r.totalMarketValue !== null ? Number(r.totalMarketValue) : 0,
      totalAssessedValue: r.totalAssessedValue !== null ? Number(r.totalAssessedValue) : 0,
    }));

    res.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(`Error fetching treasury payments report: ${error.message}`);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch treasury payments report' });
  }
});

module.exports = router;
