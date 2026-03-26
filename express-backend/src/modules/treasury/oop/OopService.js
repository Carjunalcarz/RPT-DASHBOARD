const crypto = require('crypto');
const treasuryEtlService = require('../../../services/treasuryEtlService');

class OopService {
  constructor({ supabasePrisma, logger }) {
    this.supabasePrisma = supabasePrisma;
    this.logger = logger;
  }

  normalizeRole = (role) => (role || '').toString().toLowerCase();

  canManageOrder = (user, order) => {
    const role = this.normalizeRole(user?.role);
    if (role === 'admin' || role === 'administrator') return true;
    return user?.id && order?.createdBy === user.id;
  };

  hasVisibilityTable = async (prisma) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'sidebar_item_user_visibility'
        LIMIT 1
      `
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
};

  getSidebarItemIdByPath = async (prisma, path) => {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT id::text as id
      FROM public.sidebar_items
      WHERE path = $1
      LIMIT 1
    `,
    path
  );
  return rows?.[0]?.id || null;
};

  assertTreasuryAssigned = async (user) => {
    if (!user?.id) {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const role = this.normalizeRole(user.role);
    if (role === 'admin' || role === 'administrator') return true;

    const hasTable = await this.hasVisibilityTable(this.supabasePrisma);
    if (!hasTable) return true;

    const treasuryItemId = await this.getSidebarItemIdByPath(this.supabasePrisma, '/payments');
    if (!treasuryItemId) return true;

    const visibility = await this.supabasePrisma.$queryRawUnsafe(
      `
        SELECT is_visible
        FROM public.sidebar_item_user_visibility
        WHERE user_id = $1::uuid AND item_id = $2::uuid
        LIMIT 1
      `,
      user.id,
      treasuryItemId
    );

    const isVisible = visibility?.[0]?.is_visible ?? false;
    if (!isVisible) {
      const err = new Error('Forbidden: You do not have access to the Treasury module');
      err.statusCode = 403;
      throw err;
    }

    return true;
  };

  generateOrderNumber = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `OOP-${yyyy}${mm}${dd}-${rand}`;
};

  createHistory = async ({ prisma, orderId, action, performedBy, payload }) => {
    const client = prisma || this.supabasePrisma;
  return client.oopHistory.create({
    data: {
      orderId,
      action,
      performedBy,
      payload,
    },
  });
};

  buildSnapshot = ({ order, requestBody }) => {
  return {
    order,
    requestBody,
    capturedAt: new Date().toISOString(),
  };
};

  extractPropertyIds = (requestBody) => {
  const rows = requestBody?.assessments;
  if (!Array.isArray(rows)) return [];
  const ids = rows
    .map((r) => r?.propertyId)
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
  return Array.from(new Set(ids));
};

  getRptPropertyStatuses = async (tx, propertyIds) => {
  if (!propertyIds.length) return [];
  return tx.$queryRawUnsafe(
    `SELECT id::text as id, payment_status::text as "paymentStatus"
     FROM public.rpt_property
     WHERE id = ANY($1::uuid[])`,
    propertyIds
  );
};

  setRptPropertyPaymentStatus = async (tx, { propertyIds, fromStatus, toStatus }) => {
  if (!propertyIds.length) return [];
  return tx.$queryRawUnsafe(
    `UPDATE public.rpt_property
     SET payment_status = $1::public.rpt_payment_status
     WHERE id = ANY($2::uuid[])
       AND payment_status = $3::public.rpt_payment_status
     RETURNING id::text as id`,
    toStatus,
    propertyIds,
    fromStatus
  );
};

  persistOrderPropertyIds = async (tx, { orderId, propertyIds }) => {
  await tx.$executeRawUnsafe(
    `UPDATE public.orders_of_payment
     SET property_ids = $1::jsonb
     WHERE id = $2::uuid`,
    JSON.stringify(propertyIds || []),
    orderId
  );
};

  createOrder = async ({ user, amount, description, requestBody }) => {
    if (!user?.id) {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }

    const propertyIds = this.extractPropertyIds(requestBody);
    if (!propertyIds.length) {
      const err = new Error('At least one property is required to create a payment order');
      err.statusCode = 400;
      throw err;
    }

    return this.supabasePrisma.$transaction(async (tx) => {
      const existing = await this.getRptPropertyStatuses(tx, propertyIds);
      if (existing.length !== propertyIds.length) {
        const err = new Error('One or more properties were not found');
        err.statusCode = 400;
        throw err;
      }
      const nonUnpaid = existing.filter((p) => String(p.paymentStatus || '').toLowerCase() !== 'unpaid');
      if (nonUnpaid.length) {
        const err = new Error('Only unpaid properties can be included in a payment order');
        err.statusCode = 400;
        throw err;
      }

      let created = null;
      for (let i = 0; i < 5; i += 1) {
        try {
          created = await tx.orderOfPayment.create({
            data: {
              orderNumber: this.generateOrderNumber(),
              createdBy: user.id,
              amount,
              description,
              status: 'pending',
            },
          });
          break;
        } catch (e) {
          if (e?.code === 'P2002') continue;
          throw e;
        }
      }

      if (!created) {
        const err = new Error('Failed to generate unique order number');
        err.statusCode = 500;
        throw err;
      }

      await this.persistOrderPropertyIds(tx, { orderId: created.id, propertyIds });

      const updated = await this.setRptPropertyPaymentStatus(tx, { propertyIds, fromStatus: 'unpaid', toStatus: 'pending' });
      if (updated.length !== propertyIds.length) {
        const err = new Error('Failed to update property payment status to pending');
        err.statusCode = 500;
        throw err;
      }

      await this.createHistory({
        prisma: tx,
        orderId: created.id,
        action: 'created',
        performedBy: user.id,
        payload: this.buildSnapshot({ order: created, requestBody }),
      });

      return created;
    }, { timeout: 20000 });
  };

  updateOrder = async ({ user, orderId, amount, description, requestBody }) => {
    const existing = await this.supabasePrisma.orderOfPayment.findUnique({ where: { id: orderId } });
    if (!existing) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (!this.canManageOrder(user, existing)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    if (existing.status !== 'pending') {
      const err = new Error('Only pending orders can be updated');
      err.statusCode = 400;
      throw err;
    }

    const updated = await this.supabasePrisma.orderOfPayment.update({
      where: { id: orderId },
      data: {
        amount,
        description,
      },
    });

    await this.createHistory({
      orderId: updated.id,
      action: 'updated',
      performedBy: user.id,
      payload: this.buildSnapshot({ order: updated, requestBody }),
    });

    return updated;
  };

  cancelOrder = async ({ user, orderId, requestBody }) => {
  const existing = await this.supabasePrisma.orderOfPayment.findUnique({ where: { id: orderId } });
  if (!existing) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  if (!this.canManageOrder(user, existing)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  if (existing.status !== 'pending') {
    const err = new Error('Only pending orders can be cancelled');
    err.statusCode = 400;
    throw err;
  }

  return this.supabasePrisma.$transaction(async (tx) => {
    const cancelled = await tx.orderOfPayment.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });

    const rows = await tx.$queryRawUnsafe(
      `SELECT COALESCE(property_ids, '[]'::jsonb) as "propertyIds"
       FROM public.orders_of_payment
       WHERE id = $1::uuid`,
      orderId
    );
    const propertyIds = Array.isArray(rows?.[0]?.propertyIds) ? rows[0].propertyIds : [];
    if (propertyIds.length) {
      await this.setRptPropertyPaymentStatus(tx, { propertyIds, fromStatus: 'pending', toStatus: 'unpaid' });
    }

    await this.createHistory({
      prisma: tx,
      orderId: cancelled.id,
      action: 'cancelled',
      performedBy: user.id,
      payload: this.buildSnapshot({ order: cancelled, requestBody }),
    });

    return cancelled;
  }, { timeout: 20000 });
};

  markPaid = async ({ user, orderId, requestBody }) => {
  await this.assertTreasuryAssigned(user);

  return this.supabasePrisma.$transaction(async (tx) => {
    const existing = await tx.orderOfPayment.findUnique({ where: { id: orderId } });
    if (!existing) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status === 'paid') {
      return { order: existing, etl: null, alreadyPaid: true };
    }

    if (existing.status !== 'pending') {
      const err = new Error('Only pending orders can be paid');
      err.statusCode = 400;
      throw err;
    }

    const rows = await tx.$queryRawUnsafe(
      `SELECT COALESCE(property_ids, '[]'::jsonb) as "propertyIds"
       FROM public.orders_of_payment
       WHERE id = $1::uuid`,
      orderId
    );
    const propertyIds = Array.isArray(rows?.[0]?.propertyIds) ? rows[0].propertyIds : [];
    if (!propertyIds.length) {
      const err = new Error('Order is missing property references');
      err.statusCode = 500;
      throw err;
    }

    const paidAt = new Date();
    const etl = await treasuryEtlService.exportPaidOrder({
      tx,
      order: existing,
      propertyIds,
      paidAt,
      performedBy: user,
    });

    await this.createHistory({
      prisma: tx,
      orderId: existing.id,
      action: 'etl_exported',
      performedBy: user.id,
      payload: { etl, paidAt: paidAt.toISOString() },
    });

    const updated = await this.setRptPropertyPaymentStatus(tx, { propertyIds, fromStatus: 'pending', toStatus: 'paid' });
    if (updated.length !== propertyIds.length) {
      const err = new Error('Failed to update property payment status to paid');
      err.statusCode = 500;
      throw err;
    }

    const paid = await tx.orderOfPayment.update({
      where: { id: orderId },
      data: { status: 'paid' },
    });

    await this.createHistory({
      prisma: tx,
      orderId: paid.id,
      action: 'paid',
      performedBy: user.id,
      payload: this.buildSnapshot({ order: paid, requestBody }),
    });

    return { order: paid, etl };
  }, { timeout: 20000 });
};

  listPending = async ({ user, page = 1, limit = 20 }) => {
    await this.assertTreasuryAssigned(user);
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [total, data] = await Promise.all([
      this.supabasePrisma.orderOfPayment.count({ where: { status: 'pending' } }),
      this.supabasePrisma.orderOfPayment.findMany({
        where: { status: 'pending' },
        orderBy: { dateCreated: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.max(Number(page) || 1, 1),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  };

  getOrder = async ({ user, orderId }) => {
    const order = await this.supabasePrisma.orderOfPayment.findUnique({ where: { id: orderId } });
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (!this.canManageOrder(user, order)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    return order;
  };

  getHistory = async ({ user, orderId }) => {
    const order = await this.supabasePrisma.orderOfPayment.findUnique({ where: { id: orderId } });
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    if (!this.canManageOrder(user, order)) {
      const err = new Error('Forbidden');
      err.statusCode = 403;
      throw err;
    }

    const history = await this.supabasePrisma.oopHistory.findMany({
      where: { orderId },
      orderBy: { timestamp: 'desc' },
    });

    return { order, history };
  };
}

module.exports = OopService;
