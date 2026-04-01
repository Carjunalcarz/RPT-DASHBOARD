const { supabasePrisma } = require('../database/prisma');
const logger = require('../../../utils/logger');
const { AppError } = require('../../../middleware/errorHandler');

const normalizeRole = (role) => String(role || '').toLowerCase();
const isAdminRole = (role) => ['admin', 'administrator'].includes(normalizeRole(role));

const hasVisibilityTable = async (prisma) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'rptas'
          AND table_name = 'sidebar_item_user_visibility'
        LIMIT 1
      `
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    logger.error('Error checking for visibility table in permissionsController:', err);
    return false;
  }
};

const attachVisibilityMeta = (items, { allowlistCountById, allowlistedById }) => {
  const walk = (node) => {
    node.__allowlistCount = allowlistCountById[node.id] || 0;
    node.__allowlistedForUser = !!allowlistedById[node.id];
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach(walk);
  };
  items.forEach(walk);
};

const filterSidebarTreeForUser = (item, { userId, role }) => {
  const isAdmin = isAdminRole(role);
  const allowlistCount = item?.__allowlistCount || 0;
  const allowlistedForUser = !!item?.__allowlistedForUser;

  const allowedByVisibility = isAdmin || allowlistCount === 0 || allowlistedForUser;
  const allowedByAdminOnly = !item.adminOnly || isAdmin;
  const allowed = allowedByVisibility && allowedByAdminOnly;

  const children = Array.isArray(item.children) ? item.children : [];
  const filteredChildren = children
    .map((c) => filterSidebarTreeForUser(c, { userId, role }))
    .filter(Boolean);

  if (!allowed && filteredChildren.length === 0) return null;
  if (item.adminOnly && !isAdmin) return null;

  const reason = isAdmin
    ? 'admin'
    : allowlistCount === 0
      ? 'public'
      : allowlistedForUser
        ? 'assigned'
        : 'none';

  return {
    id: item.id,
    label: item.label,
    path: allowed ? item.path : '#',
    icon: item.icon,
    parentId: item.parentId,
    order: item.order,
    adminOnly: item.adminOnly,
    isActive: item.isActive,
    access: {
      allowed,
      reason,
      allowlistCount,
      allowlistedForUser,
      accessLevel: 'view',
    },
    children: filteredChildren,
  };
};

const buildSidebarForUser = async ({ userId, role }) => {
  const items = await supabasePrisma.sidebarItem.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
    },
  });

  const supportsVisibility = await hasVisibilityTable(supabasePrisma);
  if (supportsVisibility && userId) {
    const allIds = [];
    const walk = (node) => {
      allIds.push(node.id);
      const children = Array.isArray(node.children) ? node.children : [];
      children.forEach(walk);
    };
    items.forEach(walk);

    const rows = await supabasePrisma.$queryRawUnsafe(
      `
        SELECT sidebar_item_id::text as "sidebarItemId", user_id::text as "userId"
        FROM rptas.sidebar_item_user_visibility
        WHERE sidebar_item_id = ANY($1::uuid[])
      `,
      allIds
    );

    const allowlistCountById = {};
    const allowlistedById = {};
    (rows || []).forEach((r) => {
      const sid = String(r.sidebarItemId);
      allowlistCountById[sid] = (allowlistCountById[sid] || 0) + 1;
      if (String(r.userId) === String(userId)) allowlistedById[sid] = true;
    });

    attachVisibilityMeta(items, { allowlistCountById, allowlistedById });
  } else {
    attachVisibilityMeta(items, { allowlistCountById: {}, allowlistedById: {} });
  }

  const rootItems = items.filter((item) => !item.parentId);
  return rootItems
    .map((i) => filterSidebarTreeForUser(i, { userId, role }))
    .filter(Boolean);
};

exports.getMyPermissions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const modules = await buildSidebarForUser({ userId, role });

    res.json({
      success: true,
      data: {
        user: req.user,
        modules,
      },
    });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    next(error);
  }
};

exports.getUserPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await supabasePrisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        municipalityCode: true,
        fullName: true,
        displayName: true,
        avatarUrl: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const modules = await buildSidebarForUser({ userId: user.id, role: user.role });

    res.json({
      success: true,
      data: {
        user,
        modules,
      },
    });
  } catch (error) {
    logger.error('Error fetching user permissions:', error);
    next(error);
  }
};

exports.getUserSidebarVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const supportsVisibility = await hasVisibilityTable(supabasePrisma);
    if (!supportsVisibility) {
      return next(new AppError('Sidebar user visibility table is missing.', 500));
    }

    const rows = await supabasePrisma.$queryRawUnsafe(
      `
        SELECT sidebar_item_id::text as "sidebarItemId"
        FROM rptas.sidebar_item_user_visibility
        WHERE user_id = $1::uuid
      `,
      id
    );

    res.json({
      success: true,
      data: {
        userId: id,
        sidebarItemIds: rows.map((r) => String(r.sidebarItemId)),
      },
    });
  } catch (error) {
    logger.error('Error fetching user sidebar visibility:', error);
    next(error);
  }
};

exports.setUserSidebarVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sidebarItemIds = Array.isArray(req.body?.sidebarItemIds) ? req.body.sidebarItemIds : [];

    const supportsVisibility = await hasVisibilityTable(supabasePrisma);
    if (!supportsVisibility) {
      return next(new AppError('Sidebar user visibility table is missing.', 500));
    }

    const prevRows = await supabasePrisma.$queryRawUnsafe(
      `
        SELECT sidebar_item_id::text as "sidebarItemId"
        FROM rptas.sidebar_item_user_visibility
        WHERE user_id = $1::uuid
      `,
      id
    );
    const previousIds = (prevRows || []).map((r) => String(r.sidebarItemId));

    await supabasePrisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `DELETE FROM rptas.sidebar_item_user_visibility WHERE user_id = $1::uuid`,
        id
      );
      if (sidebarItemIds.length) {
        await tx.$executeRawUnsafe(
          `
            INSERT INTO rptas.sidebar_item_user_visibility (sidebar_item_id, user_id)
            SELECT UNNEST($2::uuid[]), $1::uuid
            ON CONFLICT DO NOTHING
          `,
          id,
          sidebarItemIds
        );
      }
    });

    try {
      await supabasePrisma.auditLog.create({
        data: {
          tableName: 'sidebar_item_user_visibility',
          recordId: String(id),
          action: 'UPDATE',
          oldValues: { sidebarItemIds: previousIds },
          newValues: { sidebarItemIds: sidebarItemIds.map(String) },
          userId: req.user?.id ? String(req.user.id) : 'system',
          userEmail: req.user?.email ? String(req.user.email) : null,
          ipAddress: req.ip ? String(req.ip) : null,
          timestamp: new Date(),
          details: { kind: 'user_sidebar_visibility_update' },
        },
      });
    } catch (auditErr) {
      logger.warn('Failed to write permissions audit log', auditErr);
    }

    res.json({
      success: true,
      data: {
        userId: id,
        sidebarItemIds: sidebarItemIds.map(String),
      },
    });
  } catch (error) {
    logger.error('Error setting user sidebar visibility:', error);
    next(error);
  }
};
