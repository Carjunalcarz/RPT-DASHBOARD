const { supabasePrisma } = require('../database/prisma');
const logger = require('../utils/logger');

const normalizeRole = (role) => String(role || '').toLowerCase();
const isAdminRole = (role) => ['admin', 'administrator'].includes(normalizeRole(role));

const hasVisibilityTable = async (prisma) => {
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

  const base = {
    id: item.id,
    label: item.label,
    path: allowed ? item.path : '#',
    icon: item.icon,
    parentId: item.parentId,
    order: item.order,
    adminOnly: item.adminOnly,
    isActive: item.isActive,
    children: filteredChildren,
  };

  return base;
};

/**
 * Get all sidebar items in a hierarchical structure
 */
exports.getAllSidebarItems = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

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
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
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
          FROM public.sidebar_item_user_visibility
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

    // Only return top-level items, they include their children
    const rootItems = items.filter(item => !item.parentId);
    const filtered = rootItems
      .map((i) => filterSidebarTreeForUser(i, { userId, role }))
      .filter(Boolean);
    res.json({ success: true, data: filtered });
  } catch (error) {
    logger.error('Error fetching sidebar items:', error);
    next(error);
  }
};

/**
 * Get all sidebar items (flat list) for management
 */
exports.getManagementSidebarItems = async (req, res, next) => {
  try {
    const items = await supabasePrisma.sidebarItem.findMany({
      orderBy: [
        { parentId: 'asc' },
        { order: 'asc' }
      ]
    });

    const supportsVisibility = await hasVisibilityTable(supabasePrisma);
    let visibleByItemId = {};
    if (supportsVisibility && items.length > 0) {
      const ids = items.map((i) => i.id);
      const rows = await supabasePrisma.$queryRawUnsafe(
        `
          SELECT sidebar_item_id::text as "sidebarItemId", user_id::text as "userId"
          FROM public.sidebar_item_user_visibility
          WHERE sidebar_item_id = ANY($1::uuid[])
        `,
        ids
      );
      visibleByItemId = {};
      (rows || []).forEach((r) => {
        const sid = String(r.sidebarItemId);
        if (!visibleByItemId[sid]) visibleByItemId[sid] = [];
        visibleByItemId[sid].push(String(r.userId));
      });
    }

    res.json({
      success: true,
      data: items.map((i) => ({ ...i, visibleToUserIds: visibleByItemId[i.id] || [] })),
    });
  } catch (error) {
    logger.error('Error fetching management sidebar items:', error);
    next(error);
  }
};

/**
 * Create a new sidebar item
 */
exports.createSidebarItem = async (req, res, next) => {
  try {
    const { label, path, icon, parentId, order, adminOnly, isActive, visibleToUserIds } = req.body;
    const userIds = Array.isArray(visibleToUserIds) ? visibleToUserIds : [];

    const created = await supabasePrisma.$transaction(async (tx) => {
      const newItem = await tx.sidebarItem.create({
        data: {
          label,
          path,
          icon,
          parentId: parentId || null,
          order: parseInt(order) || 0,
          adminOnly: !!adminOnly,
          isActive: isActive !== undefined ? !!isActive : true
        }
      });

      if (userIds.length) {
        const supportsVisibility = await hasVisibilityTable(tx);
        if (!supportsVisibility) {
          const err = new Error('Sidebar user visibility table is missing. Run the sidebar_item_user_visibility migration.');
          err.statusCode = 500;
          throw err;
        }
        await tx.$executeRawUnsafe(
          `
            INSERT INTO public.sidebar_item_user_visibility (sidebar_item_id, user_id)
            SELECT $1::uuid, UNNEST($2::uuid[])
            ON CONFLICT DO NOTHING
          `,
          newItem.id,
          userIds
        );
      }

      return newItem;
    });

    res.status(201).json({ success: true, data: { ...created, visibleToUserIds: userIds } });
  } catch (error) {
    logger.error('Error creating sidebar item:', error);
    next(error);
  }
};

/**
 * Update an existing sidebar item
 */
exports.updateSidebarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, path, icon, parentId, order, adminOnly, isActive, visibleToUserIds } = req.body;
    const userIds = Array.isArray(visibleToUserIds) ? visibleToUserIds : [];

    const updated = await supabasePrisma.$transaction(async (tx) => {
      const updatedItem = await tx.sidebarItem.update({
        where: { id },
        data: {
          label,
          path,
          icon,
          parentId: parentId || null,
          order: parseInt(order) || 0,
          adminOnly: !!adminOnly,
          isActive: isActive !== undefined ? !!isActive : true
        }
      });

      const supportsVisibility = await hasVisibilityTable(tx);
      if (supportsVisibility) {
        await tx.$executeRawUnsafe(
          `DELETE FROM public.sidebar_item_user_visibility WHERE sidebar_item_id = $1::uuid`,
          id
        );
        if (userIds.length) {
          await tx.$executeRawUnsafe(
            `
              INSERT INTO public.sidebar_item_user_visibility (sidebar_item_id, user_id)
              SELECT $1::uuid, UNNEST($2::uuid[])
              ON CONFLICT DO NOTHING
            `,
            id,
            userIds
          );
        }
      } else if (userIds.length) {
        const err = new Error('Sidebar user visibility table is missing. Run the sidebar_item_user_visibility migration.');
        err.statusCode = 500;
        throw err;
      }

      return updatedItem;
    });

    res.json({ success: true, data: { ...updated, visibleToUserIds: userIds } });
  } catch (error) {
    logger.error('Error updating sidebar item:', error);
    next(error);
  }
};

/**
 * Delete a sidebar item
 */
exports.deleteSidebarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabasePrisma.sidebarItem.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Sidebar item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting sidebar item:', error);
    next(error);
  }
};

/**
 * Seed initial sidebar items (one-time use or management tool)
 */
exports.seedSidebarItems = async (req, res, next) => {
  try {
    const initialItems = [
      { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', order: 1 },
      { label: 'Property Records', path: '/properties', icon: 'Building2', order: 2 },
      { label: 'Tax Assessment', path: '/assessment', icon: 'FileText', order: 3 },
      { label: 'Payments', path: '/payments', icon: 'CreditCard', order: 4 },
      { label: 'Treasury Approval', path: '/payments/treasury', icon: 'CheckCircle', order: 5 },
      { label: 'Reports', path: '/reports', icon: 'BarChart3', order: 6 },
      { label: 'Treasury Payments Report', path: '/reports/treasury-payments', icon: 'BarChart3', order: 7 },
      { label: 'Data Entry (Legacy)', path: '/data-entry', icon: 'ClipboardEdit', order: 8 },
      { label: 'RPT Management', path: '/rpt-management', icon: 'Database', order: 9 },
      { label: 'Items', path: '/items', icon: 'Package', order: 10 },
      { label: 'Tasks', path: '/tasks', icon: 'CheckSquare', order: 11 },
      { label: 'Audit Trail', path: '/audit-trail', icon: 'FileClock', order: 12 },
      { label: 'User Management', path: '/admin/users', icon: 'UserCog', order: 13, adminOnly: false },
      { label: 'Settings', path: '/settings', icon: 'Settings', order: 14 },
    ];

    const parents = [
      { label: 'Approving Parent', path: '#', icon: 'CheckCircle', order: 13 },
      { label: 'Setup', path: '#', icon: 'Settings2', order: 14 },
    ];

    // Clear existing
    await supabasePrisma.sidebarItem.deleteMany({});

    // Create simple items
    for (const item of initialItems) {
      await supabasePrisma.sidebarItem.create({ data: item });
    }

    // Create parents and children
    for (const parent of parents) {
      const createdParent = await supabasePrisma.sidebarItem.create({ data: parent });
      
      if (parent.label === 'Approving Parent') {
        const municipality = await supabasePrisma.sidebarItem.create({
          data: { label: 'Municipality', path: '#', parentId: createdParent.id, order: 1 }
        });
        await supabasePrisma.sidebarItem.create({
          data: { label: 'Province', path: '/approvals/provincial', parentId: municipality.id, order: 1 }
        });
      } else if (parent.label === 'Setup') {
        await supabasePrisma.sidebarItem.create({
          data: { label: 'Setup_Signatory', path: '/setup/signatory', parentId: createdParent.id, order: 1 }
        });
      }
    }

    res.json({ success: true, message: 'Sidebar seeded successfully' });
  } catch (error) {
    logger.error('Error seeding sidebar items:', error);
    next(error);
  }
};
