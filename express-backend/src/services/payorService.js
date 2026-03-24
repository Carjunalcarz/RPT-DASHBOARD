const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');
const { validatePayorPayload, normalizeIdKey } = require('./payorValidation');
const { verifyPayorIdentity } = require('./identityVerificationService');

const normalize = (s) => String(s || '').trim();

const hasPayorsTable = async () => {
  try {
    const rows = await supabasePrisma.$queryRawUnsafe(
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'payors'
        LIMIT 1
      `
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
};

const toRow = (payload) => ({
  firstName: normalize(payload.firstName),
  lastName: normalize(payload.lastName),
  address: normalize(payload.address),
  idType: normalize(payload.idType).toLowerCase(),
  idNumber: normalize(payload.idNumber).toUpperCase(),
  contact: payload.contact || {},
});

const searchPayors = async ({ q, limit = 10 }) => {
  const query = normalize(q);
  const take = Math.min(Math.max(Number(limit) || 10, 1), 25);
  if (!query) return [];
  if (!(await hasPayorsTable())) {
    throw new AppError('Payors table is missing. Apply the payors migration.', 500);
  }

  const fallback = async () => {
    const rows = await supabasePrisma.$queryRawUnsafe(
      `
        SELECT
          id::text as id,
          first_name as "firstName",
          last_name as "lastName",
          address,
          id_type as "idType",
          id_number as "idNumber",
          contact,
          0::float as score
        FROM public.payors
        WHERE lower(first_name) LIKE ('%' || lower($1) || '%')
           OR lower(last_name) LIKE ('%' || lower($1) || '%')
           OR lower(address) LIKE ('%' || lower($1) || '%')
           OR id_number ILIKE ('%' || $1 || '%')
        ORDER BY last_name ASC, first_name ASC
        LIMIT $2
      `,
      query,
      take
    );
    return rows || [];
  };

  try {
    const rows = await supabasePrisma.$queryRawUnsafe(
      `
        SELECT
          id::text as id,
          first_name as "firstName",
          last_name as "lastName",
          address,
          id_type as "idType",
          id_number as "idNumber",
          contact,
          GREATEST(
            similarity(lower(first_name || ' ' || last_name || ' ' || address), lower($1)),
            similarity(lower(first_name), lower($1)),
            similarity(lower(last_name), lower($1))
          ) as score
        FROM public.payors
        WHERE id_number ILIKE ('%' || $1 || '%')
           OR lower(first_name) LIKE (lower($1) || '%')
           OR lower(last_name) LIKE (lower($1) || '%')
           OR lower(first_name || ' ' || last_name || ' ' || address) % lower($1)
        ORDER BY score DESC, last_name ASC, first_name ASC
        LIMIT $2
      `,
      query,
      take
    );
    return rows || [];
  } catch (e) {
    return fallback();
  }
};

const createPayor = async ({ user, payload }) => {
  const validation = validatePayorPayload(payload);
  if (!validation.ok) {
    throw new AppError('Validation failed', 400, { fieldErrors: validation.errors });
  }
  if (!(await hasPayorsTable())) {
    throw new AppError('Payors table is missing. Apply the payors migration.', 500);
  }

  const row = toRow(payload);
  const idv = await verifyPayorIdentity({ idType: row.idType, idNumber: row.idNumber });
  if (!idv?.verified) {
    throw new AppError('Identity verification failed', 422, { reason: idv?.reason || 'unknown' });
  }
  try {
    const created = await supabasePrisma.$queryRawUnsafe(
      `
        INSERT INTO public.payors
          (first_name, last_name, address, id_type, id_number, contact, created_by)
        VALUES
          ($1, $2, $3, $4, $5, $6::jsonb, $7::uuid)
        RETURNING
          id::text as id,
          first_name as "firstName",
          last_name as "lastName",
          address,
          id_type as "idType",
          id_number as "idNumber",
          contact,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      row.firstName,
      row.lastName,
      row.address,
      row.idType,
      row.idNumber,
      JSON.stringify(row.contact || {}),
      user?.id || null
    );
    return created?.[0];
  } catch (e) {
    const message = String(e?.message || '');
    const code = e?.code || e?.meta?.code;
    const isUniqueViolation =
      code === 'P2002' ||
      code === '23505' ||
      message.includes('payors_id_type_id_number_key') ||
      message.toLowerCase().includes('duplicate key value');
    if (isUniqueViolation) {
      throw new AppError('Payor with the same ID already exists', 409);
    }
    throw e;
  }
};

const bulkCreatePayors = async ({ user, rows }) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No rows provided', 400);
  }
  if (!(await hasPayorsTable())) {
    throw new AppError('Payors table is missing. Apply the payors migration.', 500);
  }

  const seen = new Set();
  const normalizedRows = [];
  const invalid = [];
  const duplicates = [];

  rows.forEach((r, idx) => {
    const validation = validatePayorPayload(r);
    if (!validation.ok) {
      invalid.push({ index: idx, errors: validation.errors });
      return;
    }
    const key = normalizeIdKey(r.idType, r.idNumber);
    if (seen.has(key)) {
      duplicates.push({ index: idx, key });
      return;
    }
    seen.add(key);
    normalizedRows.push(toRow(r));
  });

  if (invalid.length > 0) {
    throw new AppError('Validation failed', 400, { invalid });
  }

  if (normalizedRows.length === 0) {
    return { created: [], duplicates, failed: [] };
  }

  const created = [];
  const failed = [];

  for (let i = 0; i < normalizedRows.length; i += 1) {
    const row = normalizedRows[i];
    try {
      const idv = await verifyPayorIdentity({ idType: row.idType, idNumber: row.idNumber });
      if (!idv?.verified) {
        failed.push({ index: i, error: 'identity_verification_failed' });
        continue;
      }
      const inserted = await supabasePrisma.$queryRawUnsafe(
        `
          INSERT INTO public.payors
            (first_name, last_name, address, id_type, id_number, contact, created_by)
          VALUES
            ($1, $2, $3, $4, $5, $6::jsonb, $7::uuid)
          RETURNING
            id::text as id,
            first_name as "firstName",
            last_name as "lastName",
            address,
            id_type as "idType",
            id_number as "idNumber",
            contact,
            created_at as "createdAt",
            updated_at as "updatedAt"
        `,
        row.firstName,
        row.lastName,
        row.address,
        row.idType,
        row.idNumber,
        JSON.stringify(row.contact || {}),
        user?.id || null
      );
      if (inserted?.[0]) created.push(inserted[0]);
    } catch (e) {
      const message = String(e?.message || '');
      const code = e?.code || e?.meta?.code;
      const isUniqueViolation =
        code === 'P2002' ||
        code === '23505' ||
        message.includes('payors_id_type_id_number_key') ||
        message.toLowerCase().includes('duplicate key value');
      if (isUniqueViolation) {
        failed.push({ index: i, error: 'duplicate_id' });
      } else {
        failed.push({ index: i, error: e?.message || 'unknown_error' });
      }
    }
  }

  return { created, duplicates, failed };
};

module.exports = {
  searchPayors,
  createPayor,
  bulkCreatePayors,
};
