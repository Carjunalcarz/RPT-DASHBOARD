const express = require('express');
const router = express.Router();
const { supabasePrisma } = require('../database/prisma');
const logger = require('../../../utils/logger');
const protect = require('../../../middleware/auth');
const { DB_SCHEMA } = require('../config/database');


router.get('/stats', protect, async (req, res) => {
  try {
    const [propertiesRow] = await supabasePrisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM ${DB_SCHEMA}.rpt_property`
    );
    const totalProperties = Number(propertiesRow?.count || 0);

    const delinquentRow = await supabasePrisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM ${DB_SCHEMA}.rpt_property WHERE payment_status = 'unpaid'::${DB_SCHEMA}.rpt_payment_status`
    );
    const delinquentAccounts = Number(delinquentRow?.[0]?.count || 0);

    let pendingPayments = 0;
    try {
      pendingPayments = await supabasePrisma.orderOfPayment.count({ where: { status: 'pending' } });
    } catch {
      const pendingRow = await supabasePrisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM ${DB_SCHEMA}.orders_of_payment WHERE status = 'pending'`
      );
      pendingPayments = Number(pendingRow?.[0]?.count || 0);
    }

    let collectedTax = 0;
    try {
      const rows = await supabasePrisma.$queryRawUnsafe(
        `
          SELECT COALESCE(SUM(x.order_amount), 0) as amount
          FROM (
            SELECT DISTINCT order_id, order_amount
            FROM ${DB_SCHEMA}.treasury_payment_exports
            WHERE order_amount IS NOT NULL
          ) x
        `
      );
      collectedTax = Number(rows?.[0]?.amount || 0);
    } catch {
      collectedTax = 0;
    }

    res.json({
      totalProperties,
      collectedTax,
      pendingPayments,
      delinquentAccounts,
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;

