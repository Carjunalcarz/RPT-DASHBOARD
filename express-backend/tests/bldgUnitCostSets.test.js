const request = require('supertest');
const express = require('express');
const { errorHandler } = require('../src/middleware/errorHandler');

jest.mock('../src/middleware/auth', () => {
  const { AppError } = require('../src/middleware/errorHandler');
  const protect = (req, res, next) => {
    const role = String(req.headers['x-test-role'] || 'admin');
    req.user = { id: 'test-user', role };
    next();
  };
  protect.restrictTo = (...roles) => (req, res, next) => {
    const allowed = roles.map((r) => String(r).toLowerCase());
    const userRole = String(req.user?.role || '').toLowerCase();
    if (!allowed.includes(userRole)) return next(new AppError('You do not have permission to perform this action', 403));
    next();
  };
  return protect;
});

jest.mock('../src/modules/rptas/services/bldgUnitCostService', () => ({
  getAll: jest.fn(async () => ({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } })),
  getDistinctEffDates: jest.fn(async () => ({ success: true, data: [] })),
  getUnitCost: jest.fn(async () => null),
}));

jest.mock('../src/modules/rptas/services/bldgUnitCostSetService', () => {
  let setSeq = 1;
  let itemSeq = 1;
  const sets = new Map();
  const items = new Map();

  const nowIso = () => new Date().toISOString();

  const clone = (x) => JSON.parse(JSON.stringify(x));

  const listSets = ({ page = 1, limit = 20, city, ordinanceNo, includeDeleted = false }) => {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const all = Array.from(sets.values())
      .filter((s) => (includeDeleted ? true : !s.deleted_at))
      .filter((s) => (!city ? true : s.city === city))
      .filter((s) => (!ordinanceNo ? true : s.ordinance_no === ordinanceNo))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const total = all.length;
    const start = (p - 1) * l;
    return {
      success: true,
      data: clone(all.slice(start, start + l)),
      pagination: { page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) },
    };
  };

  const listSetItems = ({ setId, page = 1, limit = 200, includeDeleted = false }) => {
    const p = Number(page) || 1;
    const l = Number(limit) || 200;
    const all = Array.from(items.values())
      .filter((it) => it.set_id === setId)
      .filter((it) => (includeDeleted ? true : !it.deleted_at))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const total = all.length;
    const start = (p - 1) * l;
    return {
      success: true,
      data: clone(all.slice(start, start + l)),
      pagination: { page: p, limit: l, total, totalPages: Math.max(1, Math.ceil(total / l)) },
    };
  };

  return {
    __reset: () => {
      setSeq = 1;
      itemSeq = 1;
      sets.clear();
      items.clear();
    },
    createSet: jest.fn(async ({ ordinanceNo, ordinanceDate, ordinanceText, items: inputItems, createdBy }) => {
      const city = String(inputItems?.[0]?.city || '').trim() || '00';
      const id = `set-${setSeq++}`;
      const setRow = {
        id,
        ordinance_no: String(ordinanceNo),
        ordinance_date: ordinanceDate || null,
        ordinance_text: ordinanceText || String(ordinanceNo),
        city,
        created_by: createdBy || 'system',
        created_at: nowIso(),
        updated_by: null,
        updated_at: null,
        deleted_by: null,
        deleted_at: null,
      };
      sets.set(id, setRow);

      (inputItems || []).forEach((it) => {
        const itemId = `item-${itemSeq++}`;
        items.set(itemId, {
          id: itemId,
          set_id: id,
          city,
          struc_type: String(it.strucType || it.struc_type || ''),
          bldg_code: String(it.bldgCode || it.bldg_code || ''),
          bldg_code_desc: it.bldgCodeDesc || it.bldg_code_desc || null,
          unit_value: Number(it.unitValue || it.unit_value || 0),
          eff_date: String(it.effDate || it.eff_date || '').slice(0, 10),
          created_at: nowIso(),
          updated_by: null,
          updated_at: null,
          deleted_by: null,
          deleted_at: null,
        });
      });

      return { success: true, data: { set: clone(setRow), itemCount: (inputItems || []).length } };
    }),
    listSets: jest.fn(async (args) => listSets(args)),
    getSetById: jest.fn(async ({ id, includeDeleted = false }) => {
      const row = sets.get(id);
      if (!row) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      if (!includeDeleted && row.deleted_at) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      return { success: true, data: clone(row) };
    }),
    updateSet: jest.fn(async ({ id, ordinanceNo, ordinanceDate, ordinanceText, updatedBy }) => {
      const row = sets.get(id);
      if (!row || row.deleted_at) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      if (ordinanceNo !== undefined) row.ordinance_no = String(ordinanceNo);
      if (ordinanceDate !== undefined) row.ordinance_date = ordinanceDate || null;
      if (ordinanceText !== undefined) row.ordinance_text = String(ordinanceText);
      row.updated_by = updatedBy || null;
      row.updated_at = nowIso();
      return { success: true, data: clone(row) };
    }),
    listSetItems: jest.fn(async (args) => listSetItems(args)),
    createSetItem: jest.fn(async ({ setId, item }) => {
      const setRow = sets.get(setId);
      if (!setRow || setRow.deleted_at) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      const itemId = `item-${itemSeq++}`;
      const row = {
        id: itemId,
        set_id: setId,
        city: setRow.city,
        struc_type: String(item.strucType),
        bldg_code: String(item.bldgCode),
        bldg_code_desc: item.bldgCodeDesc || null,
        unit_value: Number(item.unitValue),
        eff_date: String(item.effDate).slice(0, 10),
        created_at: nowIso(),
        updated_by: null,
        updated_at: null,
        deleted_by: null,
        deleted_at: null,
      };
      items.set(itemId, row);
      return { success: true, data: clone(row) };
    }),
    updateSetItem: jest.fn(async ({ setId, itemId, item, updatedBy }) => {
      const row = items.get(itemId);
      if (!row || row.set_id !== setId || row.deleted_at) throw Object.assign(new Error('Unit cost set item not found.'), { statusCode: 404 });
      row.struc_type = String(item.strucType);
      row.bldg_code = String(item.bldgCode);
      row.bldg_code_desc = item.bldgCodeDesc || null;
      row.unit_value = Number(item.unitValue);
      row.eff_date = String(item.effDate).slice(0, 10);
      row.updated_by = updatedBy || null;
      row.updated_at = nowIso();
      return { success: true, data: clone(row) };
    }),
    deleteSetItem: jest.fn(async ({ setId, itemId, mode = 'soft', deletedBy }) => {
      const row = items.get(itemId);
      if (!row || row.set_id !== setId) throw Object.assign(new Error('Unit cost set item not found.'), { statusCode: 404 });
      if (String(mode) === 'hard') {
        items.delete(itemId);
        return { success: true, data: { id: itemId, mode: 'hard' } };
      }
      if (row.deleted_at) throw Object.assign(new Error('Unit cost set item not found.'), { statusCode: 404 });
      row.deleted_by = deletedBy || null;
      row.deleted_at = nowIso();
      return { success: true, data: { id: itemId, mode: 'soft' } };
    }),
    restoreSetItem: jest.fn(async ({ setId, itemId, restoredBy }) => {
      const row = items.get(itemId);
      if (!row || row.set_id !== setId || !row.deleted_at) throw Object.assign(new Error('Unit cost set item not found.'), { statusCode: 404 });
      row.deleted_by = null;
      row.deleted_at = null;
      row.updated_by = restoredBy || null;
      row.updated_at = nowIso();
      return { success: true, data: { id: itemId } };
    }),
    deleteSet: jest.fn(async ({ id, mode = 'soft', deletedBy }) => {
      const row = sets.get(id);
      if (!row) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      if (String(mode) === 'hard') {
        sets.delete(id);
        for (const [key, it] of items.entries()) {
          if (it.set_id === id) items.delete(key);
        }
        return { success: true, data: { id, mode: 'hard' } };
      }
      if (row.deleted_at) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      row.deleted_by = deletedBy || null;
      row.deleted_at = nowIso();
      return { success: true, data: { id, mode: 'soft' } };
    }),
    restoreSet: jest.fn(async ({ id, restoredBy }) => {
      const row = sets.get(id);
      if (!row || !row.deleted_at) throw Object.assign(new Error('Unit cost set not found.'), { statusCode: 404 });
      row.deleted_by = null;
      row.deleted_at = null;
      row.updated_by = restoredBy || null;
      row.updated_at = nowIso();
      return { success: true, data: { id } };
    }),
  };
});

const bldgUnitCostSetService = require('../src/modules/rptas/services/bldgUnitCostSetService');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bldg-unit-cost', require('../src/modules/rptas/routes/bldgUnitCostRoutes'));
  app.use(errorHandler);
  return app;
};

describe('Building Unit Cost Set CRUD', () => {
  beforeEach(() => {
    bldgUnitCostSetService.__reset();
  });

  it('creates, reads, updates, and deletes a set', async () => {
    const app = buildApp();

    const createRes = await request(app)
      .post('/api/bldg-unit-cost/sets')
      .send({
        ordinanceNo: '316-2024',
        ordinanceDate: '2026-04-21',
        ordinanceText: '316-2024 • 2026-04-21',
        items: [{ city: '03', strucType: 'I-6TH', bldgCode: 'HOGS', unitValue: 1290, effDate: '2026-01-01' }],
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const setId = createRes.body.data.set.id;
    expect(setId).toBeTruthy();

    const listRes = await request(app).get('/api/bldg-unit-cost/sets?page=1&limit=10').expect(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBe(1);

    const getRes = await request(app).get(`/api/bldg-unit-cost/sets/${setId}`).expect(200);
    expect(getRes.body.data.id).toBe(setId);

    const updRes = await request(app)
      .patch(`/api/bldg-unit-cost/sets/${setId}`)
      .send({ ordinanceText: 'UPDATED' })
      .expect(200);
    expect(updRes.body.data.ordinance_text).toBe('UPDATED');

    const delSoftRes = await request(app).delete(`/api/bldg-unit-cost/sets/${setId}?mode=soft`).expect(200);
    expect(delSoftRes.body.data.mode).toBe('soft');

    await request(app).get(`/api/bldg-unit-cost/sets/${setId}`).expect(404);
    await request(app).get(`/api/bldg-unit-cost/sets/${setId}?includeDeleted=true`).expect(200);

    const restoreRes = await request(app).post(`/api/bldg-unit-cost/sets/${setId}/restore`).expect(200);
    expect(restoreRes.body.data.id).toBe(setId);

    const delHardRes = await request(app).delete(`/api/bldg-unit-cost/sets/${setId}?mode=hard`).expect(200);
    expect(delHardRes.body.data.mode).toBe('hard');
  });

  it('creates, updates, soft-deletes, restores, and hard-deletes an item', async () => {
    const app = buildApp();
    const createRes = await request(app)
      .post('/api/bldg-unit-cost/sets')
      .send({
        ordinanceNo: '316-2024',
        ordinanceDate: '2026-04-21',
        ordinanceText: '316-2024 • 2026-04-21',
        items: [{ city: '03', strucType: 'I-6TH', bldgCode: 'HOGS', unitValue: 1290, effDate: '2026-01-01' }],
      })
      .expect(201);
    const setId = createRes.body.data.set.id;

    const addRes = await request(app)
      .post(`/api/bldg-unit-cost/sets/${setId}/items`)
      .send({ strucType: 'I', bldgCode: 'GOAS', bldgCodeDesc: 'GOAT SHED', unitValue: 850, effDate: '2012-01-01' })
      .expect(201);
    const itemId = addRes.body.data.id;

    const updRes = await request(app)
      .put(`/api/bldg-unit-cost/sets/${setId}/items/${itemId}`)
      .send({ strucType: 'I', bldgCode: 'GOAS', bldgCodeDesc: 'GOAT SHED UPDATED', unitValue: 851, effDate: '2012-01-01' })
      .expect(200);
    expect(updRes.body.data.unit_value).toBe(851);

    const delSoftRes = await request(app).delete(`/api/bldg-unit-cost/sets/${setId}/items/${itemId}?mode=soft`).expect(200);
    expect(delSoftRes.body.data.mode).toBe('soft');

    const listActive = await request(app).get(`/api/bldg-unit-cost/sets/${setId}/items?page=1&limit=100`).expect(200);
    expect(listActive.body.data.some((x) => x.id === itemId)).toBe(false);

    const listAll = await request(app).get(`/api/bldg-unit-cost/sets/${setId}/items?page=1&limit=100&includeDeleted=true`).expect(200);
    expect(listAll.body.data.some((x) => x.id === itemId)).toBe(true);

    await request(app).post(`/api/bldg-unit-cost/sets/${setId}/items/${itemId}/restore`).expect(200);
    const listAfterRestore = await request(app).get(`/api/bldg-unit-cost/sets/${setId}/items?page=1&limit=100`).expect(200);
    expect(listAfterRestore.body.data.some((x) => x.id === itemId)).toBe(true);

    const delHardRes = await request(app).delete(`/api/bldg-unit-cost/sets/${setId}/items/${itemId}?mode=hard`).expect(200);
    expect(delHardRes.body.data.mode).toBe('hard');
  });

  it('blocks writes for non-admin role', async () => {
    const app = buildApp();

    await request(app)
      .post('/api/bldg-unit-cost/sets')
      .set('x-test-role', 'user')
      .send({
        ordinanceNo: '316-2024',
        ordinanceDate: '2026-04-21',
        ordinanceText: '316-2024 • 2026-04-21',
        items: [{ city: '03', strucType: 'I-6TH', bldgCode: 'HOGS', unitValue: 1290, effDate: '2026-01-01' }],
      })
      .expect(403);
  });
});

