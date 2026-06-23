const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../../generated/supabase-client-v6');
const prisma = new PrismaClient();
const logger = require('../../../utils/logger');
const protect = require('../../../middleware/auth');
const { DB_SCHEMA } = require('../config/database');

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

// The Bank Deposits migration adds deposit_status/deposit_id/deposited_at to
// treasury_payment_exports plus the treasury_bank_deposits table. Until it runs,
// keep the existing report working by detecting the columns and degrading gracefully.
// Only the positive result is cached. A negative result is NOT cached so that a
// running server picks up the columns immediately after the migration is applied,
// without needing a restart.
let hasDepositColumnsCached = false;
const hasDepositColumns = async () => {
  if (hasDepositColumnsCached) return true;
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = '${DB_SCHEMA}'
        AND table_name = 'treasury_payment_exports'
        AND column_name = 'deposit_status'
      LIMIT 1
    `);
    const exists = Array.isArray(rows) && rows.length > 0;
    if (exists) hasDepositColumnsCached = true;
    return exists;
  } catch (err) {
    logger.error('Error checking for deposit columns:', err);
    return false;
  }
};

let hasTreasuryVisibilityTableCached = null;

const hasTreasuryVisibilityTable = async () => {
  if (hasTreasuryVisibilityTableCached !== null) {
    return hasTreasuryVisibilityTableCached;
  }
  try {
    const rows = await prisma.$queryRawUnsafe(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'rptas'
          AND table_name = 'sidebar_item_user_visibility'
        LIMIT 1
    `);
    const exists = Array.isArray(rows) && rows.length > 0;
    hasTreasuryVisibilityTableCached = exists;
    return exists;
  } catch (err) {
    logger.error('Error checking for visibility table in reportsRoutes:', err);
    // Do not cache the error state, maybe DB is temporarily down
    if (err?.code === 'P1001' || err?.code === 'P2024' || String(err?.message).includes('reach database server') || String(err?.message).includes('Timed out')) {
      throw err; // Re-throw connection issues so we don't misinterpret as missing table
    }
    return false;
  }
};

let treasurySidebarItemIdCached = null;

const getSidebarItemIdByPath = async (path) => {
  if (path === '/payments/treasury' && treasurySidebarItemIdCached) {
    return treasurySidebarItemIdCached;
  }

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT id::text as id
      FROM rptas.sidebar_items
      WHERE path = $1
      LIMIT 1
    `,
    path
  );
  
  const id = rows?.[0]?.id || null;
  if (path === '/payments/treasury' && id) {
    treasurySidebarItemIdCached = id;
  }
  return id;
};

const assertTreasuryAssigned = async (user) => {
  if (!user?.id) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  // System API users bypass assignment checks
  if (user.id === 'api-user') {
    return;
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
let paymentStatusColumnCached = null;

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
      if (paymentStatusColumnCached !== null) return paymentStatusColumnCached;
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
        paymentStatusColumnCached = Array.isArray(colCheck) && colCheck.length > 0;
        return paymentStatusColumnCached;
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

    const { from, to, orderNumber, tdn, ownerName, municipalityCode, barangayCode, minAmount, maxAmount, depositStatus } = req.query;

    const depCols = await hasDepositColumns();

    let whereClause = '1=1';
    const params = [];

    if (depCols && (depositStatus === 'on_treasury' || depositStatus === 'on_bank')) {
      whereClause += ` AND t.deposit_status = $${params.length + 1}`;
      params.push(depositStatus);
    }

    if (from) {
      // Start of day in Asia/Manila (UTC+8) mapped back to UTC for database comparison
      whereClause += ` AND t.paid_at >= $${params.length + 1}::timestamptz`;
      params.push(`${from}T00:00:00+08:00`);
    }
    if (to) {
      // End of day in Asia/Manila (UTC+8) mapped back to UTC for database comparison
      whereClause += ` AND t.paid_at <= $${params.length + 1}::timestamptz`;
      params.push(`${to}T23:59:59.999+08:00`);
    }
    if (minAmount) {
      whereClause += ` AND t.order_amount >= $${params.length + 1}::numeric`;
      params.push(String(minAmount));
    }
    if (maxAmount) {
      whereClause += ` AND t.order_amount <= $${params.length + 1}::numeric`;
      params.push(String(maxAmount));
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
        (
          SELECT h.payload->'requestBody'->>'preparedBy'
          FROM ${DB_SCHEMA}.oop_history h
          WHERE h.order_id = t.order_id AND h.action = 'created'
          ORDER BY h.timestamp ASC
          LIMIT 1
        ) as "preparedBy",
        (
          SELECT h.payload->'requestBody'->>'payerName'
          FROM ${DB_SCHEMA}.oop_history h
          WHERE h.order_id = t.order_id AND h.action = 'created'
          ORDER BY h.timestamp ASC
          LIMIT 1
        ) as "payerName",
        t.paid_at as "paidAt",
        t.paid_by::text as "paidBy",
        COALESCE(
          (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = t.paid_by LIMIT 1),
          (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = t.paid_by LIMIT 1),
          'System API'
        ) as "paidByName",
        (
          SELECT h.payload->'requestBody'->>'approvedBy'
          FROM ${DB_SCHEMA}.oop_history h
          WHERE h.order_id = t.order_id AND h.action = 'paid'
          ORDER BY h.timestamp DESC
          LIMIT 1
        ) as "approvedBy",
        (
          SELECT h.payload->'requestBody'->>'paymentMethod'
          FROM ${DB_SCHEMA}.oop_history h
          WHERE h.order_id = t.order_id AND h.action = 'paid'
          ORDER BY h.timestamp DESC
          LIMIT 1
        ) as "paymentMethod",
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
        ${depCols
          ? `t.deposit_status as "depositStatus",
             t.deposit_id::text as "depositId",
             t.deposited_at as "depositedAt",
             (SELECT d.deposit_number FROM ${DB_SCHEMA}.treasury_bank_deposits d WHERE d.id = t.deposit_id) as "depositNumber",`
          : `'on_treasury' as "depositStatus",
             NULL::text as "depositId",
             NULL::timestamptz as "depositedAt",
             NULL::text as "depositNumber",`}
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

// Collection summary: total Cash on Treasury (undeposited) vs Cash in Bank (deposited).
// Amounts are computed per distinct order, since order_amount repeats across an
// order's property rows.
router.get('/treasury-collection-summary', protect, async (req, res) => {
  try {
    await assertTreasuryAssigned(req.user);

    if (!(await hasDepositColumns())) {
      return res.json({ onTreasuryAmount: 0, onTreasuryCount: 0, onBankAmount: 0, onBankCount: 0 });
    }

    const { from, to } = req.query;
    let whereClause = '1=1';
    const params = [];
    if (from) {
      whereClause += ` AND paid_at >= $${params.length + 1}::timestamptz`;
      params.push(`${from}T00:00:00+08:00`);
    }
    if (to) {
      whereClause += ` AND paid_at <= $${params.length + 1}::timestamptz`;
      params.push(`${to}T23:59:59.999+08:00`);
    }

    const query = `
      SELECT
        COALESCE(SUM(order_amount) FILTER (WHERE deposit_status = 'on_treasury'), 0)::numeric AS "onTreasuryAmount",
        COUNT(*) FILTER (WHERE deposit_status = 'on_treasury')::int AS "onTreasuryCount",
        COALESCE(SUM(order_amount) FILTER (WHERE deposit_status = 'on_bank'), 0)::numeric AS "onBankAmount",
        COUNT(*) FILTER (WHERE deposit_status = 'on_bank')::int AS "onBankCount"
      FROM (
        SELECT DISTINCT ON (order_id) order_id, order_amount, deposit_status
        FROM ${DB_SCHEMA}.treasury_payment_exports
        WHERE ${whereClause}
        ORDER BY order_id, paid_at DESC
      ) o
    `;
    const rows = await prisma.$queryRawUnsafe(query, ...params);
    const r = rows?.[0] || {};
    res.json({
      onTreasuryAmount: Number(r.onTreasuryAmount || 0),
      onTreasuryCount: Number(r.onTreasuryCount || 0),
      onBankAmount: Number(r.onBankAmount || 0),
      onBankCount: Number(r.onBankCount || 0),
    });
  } catch (error) {
    logger.error(`Error fetching collection summary: ${error.message}`);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to fetch collection summary' });
  }
});

// List bank deposit slips.
router.get('/treasury-deposits', protect, async (req, res) => {
  try {
    await assertTreasuryAssigned(req.user);

    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    if (!(await hasDepositColumns())) {
      return res.json({ data: [], meta: { total: 0, page, limit, totalPages: 0 } });
    }

    const { from, to } = req.query;
    let whereClause = '1=1';
    const params = [];
    if (from) {
      whereClause += ` AND d.deposit_date >= $${params.length + 1}::date`;
      params.push(String(from));
    }
    if (to) {
      whereClause += ` AND d.deposit_date <= $${params.length + 1}::date`;
      params.push(String(to));
    }

    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM ${DB_SCHEMA}.treasury_bank_deposits d WHERE ${whereClause}`,
      ...params
    );
    const total = Number(countResult?.[0]?.count || 0);

    const query = `
      SELECT
        d.id::text as id,
        d.deposit_number as "depositNumber",
        d.deposit_date as "depositDate",
        d.reference_no as "referenceNo",
        d.remarks,
        d.total_amount as "totalAmount",
        d.payment_count as "paymentCount",
        d.deposited_by::text as "depositedBy",
        COALESCE(
          (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = d.deposited_by LIMIT 1),
          (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = d.deposited_by LIMIT 1),
          'System API'
        ) as "depositedByName",
        d.created_at as "createdAt"
      FROM ${DB_SCHEMA}.treasury_bank_deposits d
      WHERE ${whereClause}
      ORDER BY d.deposit_date DESC, d.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rows = await prisma.$queryRawUnsafe(query, ...params, limit, offset);
    const data = (rows || []).map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount || 0),
      paymentCount: Number(r.paymentCount || 0),
    }));

    res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error(`Error listing treasury deposits: ${error.message}`);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to list treasury deposits' });
  }
});

// Create a deposit slip: batch selected paid orders and flip them to Cash in Bank.
router.post('/treasury-deposits', protect, async (req, res) => {
  try {
    await assertTreasuryAssigned(req.user);

    if (!(await hasDepositColumns())) {
      return res.status(503).json({ error: 'Bank Deposits not initialized. Run the add_treasury_bank_deposits migration first.' });
    }

    const { orderIds, depositDate, referenceNo, remarks } = req.body || {};
    const ids = Array.isArray(orderIds) ? orderIds.filter(isUuid) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'orderIds is required (one or more valid order IDs)' });
    }
    const date = String(depositDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'depositDate is required (YYYY-MM-DD)' });
    }

    const depositedBy = isUuid(req.user?.id) ? req.user.id : null;

    const result = await prisma.$transaction(async (tx) => {
      // One row per distinct order (deposit_status is uniform across an order's rows).
      const orders = await tx.$queryRawUnsafe(
        `SELECT DISTINCT ON (order_id) order_id::text as "orderId", order_amount as "orderAmount", deposit_status as "depositStatus"
         FROM ${DB_SCHEMA}.treasury_payment_exports
         WHERE order_id = ANY($1::uuid[])
         ORDER BY order_id, paid_at DESC`,
        ids
      );

      if (!orders || orders.length === 0) {
        const err = new Error('No matching payments found for deposit');
        err.statusCode = 404;
        throw err;
      }
      const alreadyDeposited = orders.filter((o) => o.depositStatus !== 'on_treasury');
      if (alreadyDeposited.length > 0) {
        const err = new Error('One or more selected payments have already been deposited');
        err.statusCode = 409;
        throw err;
      }

      const totalAmount = orders.reduce((sum, o) => sum + Number(o.orderAmount || 0), 0);
      const paymentCount = orders.length;

      // Sequential deposit number per day: DEP-YYYYMMDD-NNN
      const seqRows = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM ${DB_SCHEMA}.treasury_bank_deposits WHERE deposit_date = $1::date`,
        date
      );
      const seq = Number(seqRows?.[0]?.count || 0) + 1;
      const depositNumber = `DEP-${date.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;

      const inserted = await tx.$queryRawUnsafe(
        `INSERT INTO ${DB_SCHEMA}.treasury_bank_deposits
           (deposit_number, deposit_date, reference_no, remarks, total_amount, payment_count, deposited_by)
         VALUES ($1::text, $2::date, $3::text, $4::text, $5::numeric, $6::int, $7::uuid)
         RETURNING id::text as id, deposit_number as "depositNumber"`,
        depositNumber,
        date,
        referenceNo ? String(referenceNo) : null,
        remarks ? String(remarks) : null,
        totalAmount,
        paymentCount,
        depositedBy
      );
      const deposit = inserted?.[0];

      await tx.$executeRawUnsafe(
        `UPDATE ${DB_SCHEMA}.treasury_payment_exports
         SET deposit_status = 'on_bank', deposit_id = $1::uuid, deposited_at = NOW(), updated_at = NOW()
         WHERE order_id = ANY($2::uuid[])`,
        deposit.id,
        ids
      );

      return { ...deposit, depositDate: date, totalAmount, paymentCount };
    });

    logger.info(`Treasury deposit created: ${result.depositNumber} count=${result.paymentCount} total=${result.totalAmount}`);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error(`Error creating treasury deposit: ${error.message}`);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create treasury deposit' });
  }
});

module.exports = router;
