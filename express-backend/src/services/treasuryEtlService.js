const crypto = require('crypto');
const logger = require('../utils/logger');

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

const validateInputs = ({ orderId, orderNumber, propertyIds }) => {
  const errors = [];
  if (!isUuid(orderId)) errors.push('orderId must be a UUID');
  if (!String(orderNumber || '').trim()) errors.push('orderNumber is required');
  if (!Array.isArray(propertyIds) || propertyIds.length === 0) errors.push('propertyIds is required');
  const invalidPropertyIds = (propertyIds || []).filter((id) => !isUuid(id));
  if (invalidPropertyIds.length) errors.push('propertyIds contains invalid UUIDs');
  return errors;
};

const summarizeValidation = ({ ownerName, tdn, pin }) => {
  const warnings = [];
  if (!String(ownerName || '').trim()) warnings.push('Missing owner name');
  if (!String(tdn || '').trim()) warnings.push('Missing TDN');
  if (!String(pin || '').trim()) warnings.push('Missing PIN');
  return warnings;
};

const loadPropertyOwnerRows = async (tx, propertyIds) => {
  return tx.$queryRawUnsafe(
    `
      SELECT
        rp.id::text as "propertyId",
        rp.pin as "pin",
        rp.tdn as "tdn",
        rp.tax_beg_yr as "taxBegYr",
        rp.municipality_code as "municipalityCode",
        rp.municipality_name_snapshot as "municipalityName",
        rp.barangay_code as "barangayCode",
        rp.barangay_name_snapshot as "barangayName",
        COALESCE(o.name, rp.owner_name_snapshot) as "ownerName",
        COALESCE(o.address, rp.owner_address_snapshot) as "ownerAddress"
      FROM public.rpt_property rp
      LEFT JOIN public.owner o ON o.id = rp.owner_id
      WHERE rp.id = ANY($1::uuid[])
    `,
    propertyIds
  );
};

const loadAssessmentAggregates = async (tx, propertyIds) => {
  const rows = await tx.$queryRawUnsafe(
    `
      SELECT
        property_id::text as "propertyId",
        COALESCE(SUM(market_value), 0)::numeric as "marketValue",
        COALESCE(SUM(ass_value), 0)::numeric as "assessedValue"
      FROM public.rpt_assessment
      WHERE property_id = ANY($1::uuid[])
      GROUP BY property_id
    `,
    propertyIds
  );
  const map = new Map();
  for (const r of rows || []) {
    map.set(String(r.propertyId), { marketValue: r.marketValue, assessedValue: r.assessedValue });
  }
  return map;
};

const upsertExportRow = async (tx, row) => {
  await tx.$executeRawUnsafe(
    `
      INSERT INTO public.treasury_payment_exports (
        etl_run_id,
        etl_version,
        order_id,
        order_number,
        order_description,
        order_created_by,
        order_created_at,
        paid_at,
        paid_by,
        order_amount,
        property_id,
        pin,
        tdn,
        tax_beg_yr,
        municipality_code,
        municipality_name,
        barangay_code,
        barangay_name,
        owner_name,
        owner_address,
        total_market_value,
        total_assessed_value,
        validation_errors
      )
      VALUES (
        $1::uuid,
        $2::int,
        $3::uuid,
        $4::text,
        $5::text,
        $6::uuid,
        $7::timestamptz,
        $8::timestamptz,
        $9::uuid,
        $10::numeric,
        $11::uuid,
        $12::text,
        $13::text,
        $14::text,
        $15::text,
        $16::text,
        $17::text,
        $18::text,
        $19::text,
        $20::text,
        $21::numeric,
        $22::numeric,
        $23::jsonb
      )
      ON CONFLICT (order_id, property_id) DO UPDATE SET
        etl_run_id = EXCLUDED.etl_run_id,
        etl_version = EXCLUDED.etl_version,
        order_number = EXCLUDED.order_number,
        order_description = EXCLUDED.order_description,
        order_created_by = EXCLUDED.order_created_by,
        order_created_at = EXCLUDED.order_created_at,
        paid_at = EXCLUDED.paid_at,
        paid_by = EXCLUDED.paid_by,
        order_amount = EXCLUDED.order_amount,
        pin = EXCLUDED.pin,
        tdn = EXCLUDED.tdn,
        tax_beg_yr = EXCLUDED.tax_beg_yr,
        municipality_code = EXCLUDED.municipality_code,
        municipality_name = EXCLUDED.municipality_name,
        barangay_code = EXCLUDED.barangay_code,
        barangay_name = EXCLUDED.barangay_name,
        owner_name = EXCLUDED.owner_name,
        owner_address = EXCLUDED.owner_address,
        total_market_value = EXCLUDED.total_market_value,
        total_assessed_value = EXCLUDED.total_assessed_value,
        validation_errors = EXCLUDED.validation_errors,
        updated_at = NOW()
    `,
    row.etlRunId,
    row.etlVersion,
    row.orderId,
    row.orderNumber,
    row.orderDescription,
    row.orderCreatedBy,
    row.orderCreatedAt,
    row.paidAt,
    row.paidBy,
    row.orderAmount,
    row.propertyId,
    row.pin,
    row.tdn,
    row.taxBegYr,
    row.municipalityCode,
    row.municipalityName,
    row.barangayCode,
    row.barangayName,
    row.ownerName,
    row.ownerAddress,
    row.totalMarketValue,
    row.totalAssessedValue,
    JSON.stringify(row.validationErrors || [])
  );
};

const exportPaidOrder = async ({ tx, order, propertyIds, paidAt, performedBy }) => {
  const orderId = order?.id;
  const orderNumber = order?.orderNumber;
  const orderAmount = order?.amount;
  const orderDescription = order?.description || null;
  const orderCreatedBy = order?.createdBy || null;
  const orderCreatedAt = order?.dateCreated || null;

  const validationErrors = validateInputs({ orderId, orderNumber, propertyIds });
  if (validationErrors.length) {
    const err = new Error(`ETL validation failed: ${validationErrors.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  if (!performedBy?.id) {
    const err = new Error('ETL requires an authenticated user');
    err.statusCode = 401;
    throw err;
  }

  const etlRunId = crypto.randomUUID();
  const etlVersion = 1;
  const startedAt = Date.now();

  logger.info(`Treasury ETL start: order=${orderId} run=${etlRunId} properties=${propertyIds.length}`);

  const [propertyRows, assessmentAgg] = await Promise.all([
    loadPropertyOwnerRows(tx, propertyIds),
    loadAssessmentAggregates(tx, propertyIds),
  ]);

  const byPropertyId = new Map((propertyRows || []).map((r) => [String(r.propertyId), r]));
  const missing = propertyIds.filter((id) => !byPropertyId.has(String(id)));
  if (missing.length) {
    const err = new Error('ETL failed: one or more properties were not found in reporting tables');
    err.statusCode = 500;
    throw err;
  }

  let warningsCount = 0;
  for (const propertyId of propertyIds) {
    const p = byPropertyId.get(String(propertyId));
    const agg = assessmentAgg.get(String(propertyId)) || { marketValue: 0, assessedValue: 0 };
    const validationWarnings = summarizeValidation({ ownerName: p.ownerName, tdn: p.tdn, pin: p.pin });
    warningsCount += validationWarnings.length;

    await upsertExportRow(tx, {
      etlRunId,
      etlVersion,
      orderId,
      orderNumber,
      orderDescription,
      orderCreatedBy,
      orderCreatedAt,
      paidAt,
      paidBy: performedBy.id,
      orderAmount,
      propertyId,
      pin: p.pin || null,
      tdn: p.tdn || null,
      taxBegYr: p.taxBegYr || null,
      municipalityCode: p.municipalityCode || null,
      municipalityName: p.municipalityName || null,
      barangayCode: p.barangayCode || null,
      barangayName: p.barangayName || null,
      ownerName: p.ownerName || null,
      ownerAddress: p.ownerAddress || null,
      totalMarketValue: agg.marketValue || 0,
      totalAssessedValue: agg.assessedValue || 0,
      validationErrors: validationWarnings,
    });
  }

  const durationMs = Date.now() - startedAt;
  logger.info(
    `Treasury ETL complete: order=${orderId} run=${etlRunId} exported=${propertyIds.length} warnings=${warningsCount} durationMs=${durationMs}`
  );

  return { etlRunId, etlVersion, exportedCount: propertyIds.length, warningsCount };
};

module.exports = {
  exportPaidOrder,
};
