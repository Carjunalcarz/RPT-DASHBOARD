const { supabasePrisma } = require('../database/prisma');
const { AppError } = require('../../../middleware/errorHandler');
const logger = require('../../../utils/logger');

const ORDINANCE_NO_RE = /^\d{1,6}-\d{4}$/;

class BldgUnitCostSetService {
  async assertSchema(client) {
    const rows = await client.$queryRaw`
      SELECT
        (to_regclass('rptas.bldg_unit_cost_sets') IS NOT NULL) AS sets,
        (to_regclass('rptas.bldg_unit_cost_set_items') IS NOT NULL) AS items
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.sets || !row?.items) {
      throw new AppError(
        'Supabase tables for Building Unit Cost Sets are not installed. Run the SQL migration to create bldg_unit_cost_sets and bldg_unit_cost_set_items.',
        500
      );
    }
  }

  parseOrdinance({ ordinanceNo, ordinanceDate, ordinanceText }) {
    const no = String(ordinanceNo || '').trim();
    if (!no) throw new AppError('ordinanceNo is required', 400);
    if (!ORDINANCE_NO_RE.test(no)) throw new AppError('Invalid ordinanceNo format. Expected like 716-2024.', 400);

    const dateStr = String(ordinanceDate || '').trim();
    let date = null;
    if (dateStr) {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) throw new AppError('Invalid ordinanceDate. Expected YYYY-MM-DD.', 400);
      date = dateStr;
    }

    const text = String(ordinanceText || no).trim();
    return { ordinanceNo: no, ordinanceDate: date, ordinanceText: text };
  }

  normalizeSetItemInput(input) {
    const strucType = String(input?.strucType ?? input?.struc_type ?? '').trim();
    const bldgCode = String(input?.bldgCode ?? input?.bldg_code ?? '').trim();
    const bldgCodeDesc = String(input?.bldgCodeDesc ?? input?.bldg_code_desc ?? '').trim();
    const effDate = String(input?.effDate ?? input?.eff_date ?? '').slice(0, 10);
    const unitValue = Number(input?.unitValue ?? input?.unit_value);

    if (!strucType) throw new AppError('Each item must include strucType.', 400);
    if (!bldgCode) throw new AppError('Each item must include bldgCode.', 400);
    if (!effDate || effDate.length !== 10) throw new AppError('Each item must include a valid effDate (YYYY-MM-DD).', 400);
    if (!Number.isFinite(unitValue)) throw new AppError('Each item must include a valid unitValue.', 400);

    return {
      strucType,
      bldgCode,
      bldgCodeDesc: bldgCodeDesc || null,
      effDate,
      unitValue,
    };
  }

  normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) throw new AppError('At least one unit cost item must be selected.', 400);

    const normalized = items.map((it) => {
      const city = String(it?.city ?? it?.City ?? '').trim();
      const strucType = String(it?.strucType ?? it?.StrucType ?? '').trim();
      const bldgCode = String(it?.bldgCode ?? it?.BldgCode ?? '').trim();
      const bldgCodeDesc = String(it?.bldgCodeDesc ?? it?.BldgCodeDesc ?? '').trim();
      const effDate = String(it?.effDate ?? it?.Eff_Date ?? '').slice(0, 10);
      const unitValue = Number(it?.unitValue ?? it?.UNIT_VALUE ?? it?.unit_value);

      if (!city) throw new AppError('Each item must include city.', 400);
      if (!strucType) throw new AppError('Each item must include strucType.', 400);
      if (!bldgCode) throw new AppError('Each item must include bldgCode.', 400);
      if (!effDate || effDate.length !== 10) throw new AppError('Each item must include a valid effDate (YYYY-MM-DD).', 400);
      if (!Number.isFinite(unitValue)) throw new AppError('Each item must include a valid unitValue.', 400);

      return {
        city,
        strucType,
        bldgCode,
        bldgCodeDesc: bldgCodeDesc || null,
        effDate,
        unitValue,
      };
    });

    const citySet = new Set(normalized.map((n) => n.city));
    if (citySet.size !== 1) {
      throw new AppError('Selected items must belong to the same city.', 400);
    }

    const dedup = new Map();
    normalized.forEach((n) => {
      const key = `${n.city}|${n.strucType}|${n.bldgCode}|${n.effDate}|${n.unitValue}`;
      if (!dedup.has(key)) dedup.set(key, n);
    });

    return [...dedup.values()];
  }

  async createSet({ ordinanceNo, ordinanceDate, ordinanceText, items, createdBy }) {
    const ordinance = this.parseOrdinance({ ordinanceNo, ordinanceDate, ordinanceText });
    const normalizedItems = this.normalizeItems(items);

    const city = normalizedItems[0].city;

    try {
      const result = await supabasePrisma.$transaction(async (tx) => {
        await this.assertSchema(tx);

        const existing = await tx.$queryRaw`
          SELECT id
          FROM rptas.bldg_unit_cost_sets
          WHERE city = ${city} AND ordinance_no = ${ordinance.ordinanceNo}
            AND deleted_at IS NULL
          LIMIT 1
        `;

        if (Array.isArray(existing) && existing.length > 0) {
          throw new AppError('Duplicate unit cost set: ordinance already exists for this city.', 409);
        }

        const inserted = await tx.$queryRaw`
          INSERT INTO rptas.bldg_unit_cost_sets (ordinance_no, ordinance_date, ordinance_text, city, created_by)
          VALUES (
            ${ordinance.ordinanceNo},
            CAST(${ordinance.ordinanceDate} AS date),
            ${ordinance.ordinanceText},
            ${city},
            ${createdBy}
          )
          RETURNING id, ordinance_no, ordinance_date, ordinance_text, city, created_by, created_at
        `;

        const setRow = Array.isArray(inserted) ? inserted[0] : null;
        if (!setRow?.id) throw new AppError('Failed to create unit cost set.', 500);

        const itemsJson = JSON.stringify(normalizedItems);
        await tx.$executeRaw`
          INSERT INTO rptas.bldg_unit_cost_set_items
            (set_id, city, struc_type, bldg_code, bldg_code_desc, unit_value, eff_date)
          SELECT
            CAST(${setRow.id} AS uuid),
            (x->>'city')::text,
            (x->>'strucType')::text,
            (x->>'bldgCode')::text,
            NULLIF((x->>'bldgCodeDesc')::text, '')::text,
            (x->>'unitValue')::numeric,
            (x->>'effDate')::date
          FROM jsonb_array_elements(CAST(${itemsJson} AS jsonb)) AS x
        `;

        return { set: setRow, itemCount: normalizedItems.length };
      }, { maxWait: 10000, timeout: 60000 });

      return { success: true, data: result };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.createSet:', error);
      throw new AppError(error.message || 'Failed to create unit cost set', 500);
    }
  }

  async getSetById({ id, includeDeleted = false }) {
    try {
      await this.assertSchema(supabasePrisma);

      const idVal = String(id || '').trim();
      if (!idVal) throw new AppError('id is required', 400);

      const rows = await supabasePrisma.$queryRaw`
        SELECT id, ordinance_no, ordinance_date, ordinance_text, city, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at
        FROM rptas.bldg_unit_cost_sets
        WHERE id = CAST(${idVal} AS uuid)
          AND (${includeDeleted}::boolean = true OR deleted_at IS NULL)
        LIMIT 1
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set not found.', 404);

      return { success: true, data: row };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.getSetById:', error);
      throw new AppError(error.message || 'Failed to load unit cost set', 500);
    }
  }

  async updateSet({ id, ordinanceNo, ordinanceDate, ordinanceText, updatedBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const idVal = String(id || '').trim();
      if (!idVal) throw new AppError('id is required', 400);

      const noVal = ordinanceNo === undefined ? undefined : String(ordinanceNo || '').trim();
      if (noVal !== undefined) {
        if (!noVal) throw new AppError('ordinanceNo is required', 400);
        if (!ORDINANCE_NO_RE.test(noVal)) throw new AppError('Invalid ordinanceNo format. Expected like 716-2024.', 400);
      }

      const dateVal = ordinanceDate === undefined ? undefined : String(ordinanceDate || '').trim();
      if (dateVal !== undefined && dateVal) {
        const d = new Date(dateVal);
        if (Number.isNaN(d.getTime())) throw new AppError('Invalid ordinanceDate. Expected YYYY-MM-DD.', 400);
      }

      const textVal = ordinanceText === undefined ? undefined : String(ordinanceText || '').trim();

      const rows = await supabasePrisma.$queryRaw`
        UPDATE rptas.bldg_unit_cost_sets
        SET
          ordinance_no = COALESCE(${noVal}::text, ordinance_no),
          ordinance_date = CASE
            WHEN ${dateVal}::text IS NULL THEN ordinance_date
            WHEN ${dateVal}::text = '' THEN NULL
            ELSE CAST(${dateVal} AS date)
          END,
          ordinance_text = COALESCE(${textVal}::text, ordinance_text),
          updated_by = ${String(updatedBy || '').trim() || null},
          updated_at = NOW()
        WHERE id = CAST(${idVal} AS uuid)
          AND deleted_at IS NULL
        RETURNING id, ordinance_no, ordinance_date, ordinance_text, city, created_by, created_at, updated_by, updated_at
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set not found.', 404);

      return { success: true, data: row };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.updateSet:', error);
      throw new AppError(error.message || 'Failed to update unit cost set', 500);
    }
  }

  async listSetItems({ setId, page = 1, limit = 200, includeDeleted = false, search }) {
    try {
      await this.assertSchema(supabasePrisma);

      const idVal = String(setId || '').trim();
      if (!idVal) throw new AppError('setId is required', 400);

      const qVal = String(search || '').trim() || null;

      const p = Number(page) || 1;
      const l = Number(limit) || 200;
      const offset = (p - 1) * l;

      const rows = await supabasePrisma.$queryRaw`
        SELECT id, set_id, city, struc_type, bldg_code, bldg_code_desc, unit_value, eff_date, created_at, updated_by, updated_at, deleted_by, deleted_at
        FROM rptas.bldg_unit_cost_set_items
        WHERE set_id = CAST(${idVal} AS uuid)
          AND (${includeDeleted}::boolean = true OR deleted_at IS NULL)
          AND (
            ${qVal}::text IS NULL
            OR struc_type ILIKE ('%' || ${qVal}::text || '%')
            OR bldg_code ILIKE ('%' || ${qVal}::text || '%')
            OR COALESCE(bldg_code_desc, '') ILIKE ('%' || ${qVal}::text || '%')
            OR eff_date::text ILIKE ('%' || ${qVal}::text || '%')
            OR unit_value::text ILIKE ('%' || ${qVal}::text || '%')
          )
        ORDER BY struc_type ASC, bldg_code ASC, eff_date DESC, unit_value DESC
        OFFSET ${offset} LIMIT ${l}
      `;

      const count = await supabasePrisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM rptas.bldg_unit_cost_set_items
        WHERE set_id = CAST(${idVal} AS uuid)
          AND (${includeDeleted}::boolean = true OR deleted_at IS NULL)
          AND (
            ${qVal}::text IS NULL
            OR struc_type ILIKE ('%' || ${qVal}::text || '%')
            OR bldg_code ILIKE ('%' || ${qVal}::text || '%')
            OR COALESCE(bldg_code_desc, '') ILIKE ('%' || ${qVal}::text || '%')
            OR eff_date::text ILIKE ('%' || ${qVal}::text || '%')
            OR unit_value::text ILIKE ('%' || ${qVal}::text || '%')
          )
      `;

      const total = Array.isArray(count) && count[0]?.total ? Number(count[0].total) : 0;

      return {
        success: true,
        data: rows || [],
        pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) || 1 },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.listSetItems:', error);
      throw new AppError(error.message || 'Failed to list unit cost set items', 500);
    }
  }

  async createSetItem({ setId, item, createdBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const setIdVal = String(setId || '').trim();
      if (!setIdVal) throw new AppError('setId is required', 400);

      const normalized = this.normalizeSetItemInput(item);

      const setRows = await supabasePrisma.$queryRaw`
        SELECT id, city
        FROM rptas.bldg_unit_cost_sets
        WHERE id = CAST(${setIdVal} AS uuid)
          AND deleted_at IS NULL
        LIMIT 1
      `;
      const setRow = Array.isArray(setRows) ? setRows[0] : null;
      if (!setRow?.id) throw new AppError('Unit cost set not found.', 404);

      const rows = await supabasePrisma.$queryRaw`
        INSERT INTO rptas.bldg_unit_cost_set_items
          (set_id, city, struc_type, bldg_code, bldg_code_desc, unit_value, eff_date)
        VALUES
          (
            CAST(${setRow.id} AS uuid),
            ${String(setRow.city || '').trim()},
            ${normalized.strucType},
            ${normalized.bldgCode},
            ${normalized.bldgCodeDesc},
            CAST(${normalized.unitValue} AS numeric),
            CAST(${normalized.effDate} AS date)
          )
        RETURNING id, set_id, city, struc_type, bldg_code, bldg_code_desc, unit_value, eff_date, created_at
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Failed to create unit cost set item.', 500);

      return { success: true, data: row };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.createSetItem:', error);
      throw new AppError(error.message || 'Failed to create unit cost set item', 500);
    }
  }

  async updateSetItem({ setId, itemId, item, updatedBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const setIdVal = String(setId || '').trim();
      const itemIdVal = String(itemId || '').trim();
      if (!setIdVal) throw new AppError('setId is required', 400);
      if (!itemIdVal) throw new AppError('itemId is required', 400);

      const normalized = this.normalizeSetItemInput(item);

      const rows = await supabasePrisma.$queryRaw`
        UPDATE rptas.bldg_unit_cost_set_items
        SET
          struc_type = ${normalized.strucType},
          bldg_code = ${normalized.bldgCode},
          bldg_code_desc = ${normalized.bldgCodeDesc},
          unit_value = CAST(${normalized.unitValue} AS numeric),
          eff_date = CAST(${normalized.effDate} AS date),
          updated_by = ${String(updatedBy || '').trim() || null},
          updated_at = NOW()
        WHERE id = CAST(${itemIdVal} AS uuid)
          AND set_id = CAST(${setIdVal} AS uuid)
          AND deleted_at IS NULL
        RETURNING id, set_id, city, struc_type, bldg_code, bldg_code_desc, unit_value, eff_date, created_at, updated_by, updated_at
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set item not found.', 404);

      return { success: true, data: row };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.updateSetItem:', error);
      throw new AppError(error.message || 'Failed to update unit cost set item', 500);
    }
  }

  async deleteSetItem({ setId, itemId, mode = 'soft', deletedBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const setIdVal = String(setId || '').trim();
      const itemIdVal = String(itemId || '').trim();
      if (!setIdVal) throw new AppError('setId is required', 400);
      if (!itemIdVal) throw new AppError('itemId is required', 400);

      const modeVal = String(mode || 'soft').toLowerCase();
      if (modeVal !== 'soft' && modeVal !== 'hard') throw new AppError('Invalid delete mode. Use soft or hard.', 400);

      if (modeVal === 'hard') {
        const rows = await supabasePrisma.$queryRaw`
          DELETE FROM rptas.bldg_unit_cost_set_items
          WHERE id = CAST(${itemIdVal} AS uuid)
            AND set_id = CAST(${setIdVal} AS uuid)
          RETURNING id
        `;

        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row?.id) throw new AppError('Unit cost set item not found.', 404);
        return { success: true, data: { id: row.id, mode: 'hard' } };
      }

      const rows = await supabasePrisma.$queryRaw`
        UPDATE rptas.bldg_unit_cost_set_items
        SET deleted_by = ${String(deletedBy || '').trim() || null}, deleted_at = NOW()
        WHERE id = CAST(${itemIdVal} AS uuid)
          AND set_id = CAST(${setIdVal} AS uuid)
          AND deleted_at IS NULL
        RETURNING id
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set item not found.', 404);

      return { success: true, data: { id: row.id, mode: 'soft' } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.deleteSetItem:', error);
      throw new AppError(error.message || 'Failed to delete unit cost set item', 500);
    }
  }

  async restoreSet({ id, restoredBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const idVal = String(id || '').trim();
      if (!idVal) throw new AppError('id is required', 400);

      const rows = await supabasePrisma.$queryRaw`
        UPDATE rptas.bldg_unit_cost_sets
        SET deleted_by = NULL, deleted_at = NULL, updated_by = ${String(restoredBy || '').trim() || null}, updated_at = NOW()
        WHERE id = CAST(${idVal} AS uuid)
          AND deleted_at IS NOT NULL
        RETURNING id
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set not found.', 404);

      return { success: true, data: { id: row.id } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.restoreSet:', error);
      throw new AppError(error.message || 'Failed to restore unit cost set', 500);
    }
  }

  async restoreSetItem({ setId, itemId, restoredBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const setIdVal = String(setId || '').trim();
      const itemIdVal = String(itemId || '').trim();
      if (!setIdVal) throw new AppError('setId is required', 400);
      if (!itemIdVal) throw new AppError('itemId is required', 400);

      const rows = await supabasePrisma.$queryRaw`
        UPDATE rptas.bldg_unit_cost_set_items
        SET deleted_by = NULL, deleted_at = NULL, updated_by = ${String(restoredBy || '').trim() || null}, updated_at = NOW()
        WHERE id = CAST(${itemIdVal} AS uuid)
          AND set_id = CAST(${setIdVal} AS uuid)
          AND deleted_at IS NOT NULL
        RETURNING id
      `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set item not found.', 404);

      return { success: true, data: { id: row.id } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.restoreSetItem:', error);
      throw new AppError(error.message || 'Failed to restore unit cost set item', 500);
    }
  }

  async deleteSet({ id, mode = 'soft', deletedBy }) {
    try {
      await this.assertSchema(supabasePrisma);

      const idVal = String(id || '').trim();
      if (!idVal) throw new AppError('id is required', 400);

      const modeVal = String(mode || 'soft').toLowerCase();
      if (modeVal !== 'soft' && modeVal !== 'hard') throw new AppError('Invalid delete mode. Use soft or hard.', 400);

      const rows =
        modeVal === 'hard'
          ? await supabasePrisma.$queryRaw`
              DELETE FROM rptas.bldg_unit_cost_sets
              WHERE id = CAST(${idVal} AS uuid)
              RETURNING id
            `
          : await supabasePrisma.$queryRaw`
              UPDATE rptas.bldg_unit_cost_sets
              SET deleted_by = ${String(deletedBy || '').trim() || null}, deleted_at = NOW()
              WHERE id = CAST(${idVal} AS uuid)
                AND deleted_at IS NULL
              RETURNING id
            `;

      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.id) throw new AppError('Unit cost set not found.', 404);

      return { success: true, data: { id: row.id, mode: modeVal } };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in BldgUnitCostSetService.deleteSet:', error);
      throw new AppError(error.message || 'Failed to delete unit cost set', 500);
    }
  }

  async listSets({ page = 1, limit = 20, city, ordinanceNo, includeDeleted = false }) {
    try {
      await this.assertSchema(supabasePrisma);

      const p = Number(page) || 1;
      const l = Number(limit) || 20;
      const offset = (p - 1) * l;

      const cityVal = String(city || '').trim() || null;
      const ordVal = String(ordinanceNo || '').trim() || null;

      const rows = await supabasePrisma.$queryRaw`
        SELECT id, ordinance_no, ordinance_date, ordinance_text, city, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at
        FROM rptas.bldg_unit_cost_sets
        WHERE (${cityVal}::text IS NULL OR city = ${cityVal})
          AND (${ordVal}::text IS NULL OR ordinance_no = ${ordVal})
          AND (${includeDeleted}::boolean = true OR deleted_at IS NULL)
        ORDER BY created_at DESC
        OFFSET ${offset} LIMIT ${l}
      `;

      const count = await supabasePrisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM rptas.bldg_unit_cost_sets
        WHERE (${cityVal}::text IS NULL OR city = ${cityVal})
          AND (${ordVal}::text IS NULL OR ordinance_no = ${ordVal})
          AND (${includeDeleted}::boolean = true OR deleted_at IS NULL)
      `;

      const total = Array.isArray(count) && count[0]?.total ? Number(count[0].total) : 0;

      return {
        success: true,
        data: rows || [],
        pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) || 1 },
      };
    } catch (error) {
      logger.error('Error in BldgUnitCostSetService.listSets:', error);
      throw new AppError(error.message || 'Failed to list unit cost sets', 500);
    }
  }
}

module.exports = new BldgUnitCostSetService();
