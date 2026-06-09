/**
 * RBAC service — operates on the live Supabase RBAC schema defined in
 * LocalGovernmentUnit/supabase/migrations/005_public_rbac_tables.sql.
 *
 *   roles(id, role_code, role_name)
 *   modules(id, module_name, route_path, icons, is_active, file_path, category)
 *   role_permissions(role_id, module_id, can_select|can_insert|can_update|can_delete)
 *   user_roles(user_id, role_id)
 *
 * A user has "module visibility" on a module if any of their role_permissions
 * rows for that module has any can_* flag set to true.
 */

const { AppError } = require('../../middleware/errorHandler');
const { invalidateUserPermissions } = require('../../middleware/requirePermission');

const ACTIONS = ['select', 'insert', 'update', 'delete'];
const ACTION_TO_COL = {
  select: 'canSelect',
  insert: 'canInsert',
  update: 'canUpdate',
  delete: 'canDelete',
};

function presentModule(m) {
  if (!m) return null;
  return {
    id: m.id,
    moduleName: m.moduleName,
    routePath: m.routePath,
    icons: m.icons,
    isActive: m.isActive,
    filePath: m.filePath,
    category: m.category,
    createdAt: m.createdAt,
  };
}

function presentRole(r) {
  if (!r) return null;
  return {
    id: r.id,
    roleCode: r.roleCode,
    roleName: r.roleName,
    createdAt: r.createdAt,
  };
}

class RbacService {
  constructor({ supabasePrisma, logger }) {
    this.prisma = supabasePrisma;
    this.logger = logger;
  }

  // ---------------- modules ----------------

  async listModules({ activeOnly = true } = {}) {
    const rows = await this.prisma.module.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ category: 'asc' }, { moduleName: 'asc' }],
    });
    return rows.map(presentModule);
  }

  async getModuleByRoute(routePath) {
    const m = await this.prisma.module.findUnique({ where: { routePath } });
    return m ? presentModule(m) : null;
  }

  async createModule({
    moduleName,
    routePath,
    icons,
    filePath,
    category,
    isActive = true,
  } = {}) {
    if (!moduleName || !String(moduleName).trim()) {
      throw new AppError('moduleName is required', 400);
    }
    if (!routePath || !String(routePath).trim()) {
      throw new AppError('routePath is required', 400);
    }

    try {
      const row = await this.prisma.module.create({
        data: {
          moduleName: String(moduleName).trim(),
          routePath: String(routePath).trim(),
          icons: icons ? String(icons).trim() : null,
          filePath: filePath ? String(filePath).trim() : null,
          category: category ? String(category).trim() : null,
          isActive: !!isActive,
        },
      });
      return presentModule(row);
    } catch (err) {
      // Unique constraint on route_path (modules_route_path_key).
      if (err.code === 'P2002') {
        throw new AppError(
          `A module with route_path "${routePath}" already exists`,
          409,
        );
      }
      throw err;
    }
  }

  async updateModule(id, payload = {}) {
    const existing = await this.prisma.module.findUnique({ where: { id } });
    if (!existing) throw new AppError('Module not found', 404);

    const data = {};
    if (payload.moduleName !== undefined) {
      data.moduleName = String(payload.moduleName).trim();
    }
    if (payload.routePath !== undefined) {
      data.routePath = String(payload.routePath).trim();
    }
    if (payload.icons !== undefined) {
      data.icons = payload.icons ? String(payload.icons).trim() : null;
    }
    if (payload.filePath !== undefined) {
      data.filePath = payload.filePath ? String(payload.filePath).trim() : null;
    }
    if (payload.category !== undefined) {
      data.category = payload.category ? String(payload.category).trim() : null;
    }
    if (payload.isActive !== undefined) {
      data.isActive = !!payload.isActive;
    }

    try {
      const row = await this.prisma.module.update({ where: { id }, data });
      return presentModule(row);
    } catch (err) {
      if (err.code === 'P2002') {
        throw new AppError(
          `A module with that route_path already exists`,
          409,
        );
      }
      throw err;
    }
  }

  async deleteModule(id) {
    const existing = await this.prisma.module.findUnique({ where: { id } });
    if (!existing) throw new AppError('Module not found', 404);

    // role_permissions referencing this module cascade-delete via FK.
    // Invalidate the cache for any user whose role was linked to it.
    const affected = await this.prisma.rolePermission.findMany({
      where: { moduleId: id },
      select: { roleId: true },
    });
    await this.prisma.module.delete({ where: { id } });

    if (affected.length) {
      const roleIds = Array.from(
        new Set(affected.map((rp) => rp.roleId).filter(Boolean)),
      );
      if (roleIds.length) {
        const users = await this.prisma.userRole.findMany({
          where: { roleId: { in: roleIds } },
          select: { userId: true },
        });
        users.forEach((u) => u.userId && invalidateUserPermissions(u.userId));
      }
    }

    return { id };
  }

  // ---------------- roles ----------------

  async listRoles() {
    const rows = await this.prisma.role.findMany({
      orderBy: { roleName: 'asc' },
      include: { _count: { select: { permissions: true, userRoles: true } } },
    });
    return rows.map((r) => ({
      ...presentRole(r),
      moduleCount: r._count?.permissions ?? 0,
      userCount: r._count?.userRoles ?? 0,
    }));
  }

  async getRole(id) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { module: true } } },
    });
    if (!role) throw new AppError('Role not found', 404);
    const modules = (role.permissions || [])
      .filter((rp) => rp.module && (rp.canSelect || rp.canInsert || rp.canUpdate || rp.canDelete))
      .map((rp) => ({
        ...presentModule(rp.module),
        canSelect: rp.canSelect,
        canInsert: rp.canInsert,
        canUpdate: rp.canUpdate,
        canDelete: rp.canDelete,
      }));
    return {
      ...presentRole(role),
      modules,
    };
  }

  async createRole({ roleCode, roleName }) {
    if (!roleCode || !roleName) {
      throw new AppError('roleCode and roleName are required', 400);
    }
    return presentRole(await this.prisma.role.create({
      data: {
        roleCode: String(roleCode).trim(),
        roleName: String(roleName).trim(),
      },
    }));
  }

  async updateRole(id, { roleCode, roleName }) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError('Role not found', 404);
    return presentRole(await this.prisma.role.update({
      where: { id },
      data: {
        roleCode: roleCode === undefined ? role.roleCode : String(roleCode).trim(),
        roleName: roleName === undefined ? role.roleName : String(roleName).trim(),
      },
    }));
  }

  async deleteRole(id) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError('Role not found', 404);
    const affected = await this.prisma.userRole.findMany({
      where: { roleId: id }, select: { userId: true },
    });
    await this.prisma.role.delete({ where: { id } });
    affected.forEach((u) => u.userId && invalidateUserPermissions(u.userId));
    return { id };
  }

  /**
   * Sync a role's module access set.
   *
   * @param roleId
   * @param items  Either:
   *   - string[]  module ids — granted full CRUD (can_*=true)
   *   - Array<{ moduleId, canSelect?, canInsert?, canUpdate?, canDelete? }>
   */
  async setRoleModules(roleId, items) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('Role not found', 404);

    const normalised = (items || []).map((it) => {
      if (typeof it === 'string') {
        return {
          moduleId: it,
          canSelect: true, canInsert: true, canUpdate: true, canDelete: true,
        };
      }
      return {
        moduleId: String(it.moduleId),
        canSelect: !!(it.canSelect ?? true),
        canInsert: !!(it.canInsert ?? false),
        canUpdate: !!(it.canUpdate ?? false),
        canDelete: !!(it.canDelete ?? false),
      };
    }).filter((it) => it.moduleId);

    // Validate module ids exist.
    if (normalised.length > 0) {
      const ids = Array.from(new Set(normalised.map((it) => it.moduleId)));
      const found = await this.prisma.module.findMany({
        where: { id: { in: ids } }, select: { id: true },
      });
      const valid = new Set(found.map((m) => m.id));
      const missing = ids.filter((mid) => !valid.has(mid));
      if (missing.length) {
        throw new AppError(`Unknown module ids: ${missing.join(', ')}`, 400);
      }
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...(normalised.length > 0
        ? [this.prisma.rolePermission.createMany({
            data: normalised.map((it) => ({
              roleId,
              moduleId: it.moduleId,
              canSelect: it.canSelect,
              canInsert: it.canInsert,
              canUpdate: it.canUpdate,
              canDelete: it.canDelete,
            })),
            skipDuplicates: true,
          })]
        : []),
    ]);

    const affected = await this.prisma.userRole.findMany({
      where: { roleId }, select: { userId: true },
    });
    affected.forEach((u) => u.userId && invalidateUserPermissions(u.userId));

    return this.getRole(roleId);
  }

  /**
   * Upsert one role->module access row with explicit CRUD flags.
   * Used by the per-action Role Permissions page where the admin toggles
   * Select/Insert/Update/Delete per role+module.
   */
  async upsertRoleModule(roleId, moduleId, perms = {}) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('Role not found', 404);
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) throw new AppError('Module not found', 404);

    const data = {
      canSelect: !!perms.canSelect,
      canInsert: !!perms.canInsert,
      canUpdate: !!perms.canUpdate,
      canDelete: !!perms.canDelete,
    };

    const existing = await this.prisma.rolePermission.findFirst({
      where: { roleId, moduleId },
    });

    let row;
    if (existing) {
      row = await this.prisma.rolePermission.update({
        where: { id: existing.id }, data,
      });
    } else {
      row = await this.prisma.rolePermission.create({
        data: { roleId, moduleId, ...data },
      });
    }

    // Invalidate per-user permission cache for every user with this role.
    const affected = await this.prisma.userRole.findMany({
      where: { roleId }, select: { userId: true },
    });
    affected.forEach((u) => u.userId && invalidateUserPermissions(u.userId));

    return {
      id: row.id,
      roleId: row.roleId,
      moduleId: row.moduleId,
      canSelect: row.canSelect,
      canInsert: row.canInsert,
      canUpdate: row.canUpdate,
      canDelete: row.canDelete,
    };
  }

  /**
   * Remove one role->module access row. Used by the Role Permissions page
   * when the admin removes a single module's access from a role without
   * touching the rest.
   */
  async removeRoleModule(roleId, moduleId) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('Role not found', 404);

    const deleted = await this.prisma.rolePermission.deleteMany({
      where: { roleId, moduleId },
    });

    const affected = await this.prisma.userRole.findMany({
      where: { roleId }, select: { userId: true },
    });
    affected.forEach((u) => u.userId && invalidateUserPermissions(u.userId));

    return { roleId, moduleId, removed: deleted.count };
  }

  // ---------------- user <-> role ----------------

  async getUserRoles(userId) {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((ur) => ur.role)
      .map((ur) => ({ ...presentRole(ur.role), assignedAt: ur.createdAt }));
  }

  async setUserRoles(userId, roleIds) {
    const ids = Array.from(new Set((roleIds || []).map(String)));
    if (ids.length > 0) {
      const found = await this.prisma.role.findMany({
        where: { id: { in: ids } }, select: { id: true },
      });
      const valid = new Set(found.map((r) => r.id));
      const missing = ids.filter((rid) => !valid.has(rid));
      if (missing.length) {
        throw new AppError(`Unknown role ids: ${missing.join(', ')}`, 400);
      }
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      ...(ids.length > 0
        ? [this.prisma.userRole.createMany({
            data: ids.map((rid) => ({ userId, roleId: rid })),
            skipDuplicates: true,
          })]
        : []),
    ]);

    invalidateUserPermissions(userId);
    return this.getUserRoles(userId);
  }

  async assignRoleToUser(userId, roleId) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('Role not found', 404);
    // user_roles has UNIQUE (user_id, role_id), so upsert via deleteMany+create
    // keeps it simple and side-effect free.
    await this.prisma.rolePermission; // touch schema (no-op)
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
    await this.prisma.userRole.create({ data: { userId, roleId } });
    invalidateUserPermissions(userId);
    return this.getUserRoles(userId);
  }

  async revokeRoleFromUser(userId, roleId) {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
    invalidateUserPermissions(userId);
    return this.getUserRoles(userId);
  }

  /**
   * Bootstrap helper for the force-admin dev flow. Ensures `userId` holds the
   * super_admin role and PERSISTS it, so the user remains a real super_admin
   * after the frontend VITE_FORCE_ADMIN flag is turned back off. Idempotent;
   * creates the super_admin role if the catalog seed hasn't been run yet.
   *
   * NOTE: callers MUST gate this behind the backend ALLOW_FORCE_ADMIN env flag
   * — never expose self-promotion to clients unconditionally.
   */
  async ensureSuperAdmin(userId) {
    if (!userId) return false;

    let role = await this.prisma.role.findFirst({
      where: { roleCode: 'super_admin' },
    });
    if (!role) {
      role = await this.prisma.role.create({
        data: { roleCode: 'super_admin', roleName: 'Super Admin' },
      });
    }

    // user_roles has UNIQUE (user_id, role_id); mirror assignRoleToUser's
    // delete-then-create so the assignment stays idempotent.
    await this.prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
    await this.prisma.userRole.create({ data: { userId, roleId: role.id } });
    invalidateUserPermissions(userId);
    return true;
  }

  // ---------------- facilities ----------------

  async listFacilities({ activeOnly = false } = {}) {
    const rows = await this.prisma.facility.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { facilityName: 'asc' },
    });
    return rows.map((f) => ({
      id: f.id,
      facilityName: f.facilityName,
      isActive: f.isActive,
      createdAt: f.createdAt,
    }));
  }

  async createFacility({ facilityName, isActive = true } = {}) {
    if (!facilityName || !String(facilityName).trim()) {
      throw new AppError('facilityName is required', 400);
    }
    const row = await this.prisma.facility.create({
      data: {
        facilityName: String(facilityName).trim(),
        isActive: !!isActive,
      },
    });
    return {
      id: row.id,
      facilityName: row.facilityName,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  async updateFacility(id, { facilityName, isActive } = {}) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) throw new AppError('Facility not found', 404);

    const row = await this.prisma.facility.update({
      where: { id },
      data: {
        ...(facilityName !== undefined
          ? { facilityName: String(facilityName).trim() }
          : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      },
    });
    return {
      id: row.id,
      facilityName: row.facilityName,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  async deleteFacility(id) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) throw new AppError('Facility not found', 404);
    await this.prisma.facility.delete({ where: { id } });
    return { id };
  }

  // ---------------- user <-> facilities ----------------

  async getUserFacilities(userId) {
    if (!userId) throw new AppError('userId required', 400);
    const rows = await this.prisma.userFacility.findMany({
      where: { userId },
      include: { facility: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((uf) => uf.facility)
      .map((uf) => ({
        id: uf.facility.id,
        facilityName: uf.facility.facilityName,
        isActive: uf.facility.isActive,
        assignedAt: uf.createdAt,
      }));
  }

  async setUserFacilities(userId, facilityIds = []) {
    if (!userId) throw new AppError('userId required', 400);
    const ids = Array.from(new Set((facilityIds || []).map(String)));

    if (ids.length > 0) {
      const found = await this.prisma.facility.findMany({
        where: { id: { in: ids } }, select: { id: true },
      });
      const valid = new Set(found.map((f) => f.id));
      const missing = ids.filter((fid) => !valid.has(fid));
      if (missing.length) {
        throw new AppError(`Unknown facility ids: ${missing.join(', ')}`, 400);
      }
    }

    await this.prisma.$transaction([
      this.prisma.userFacility.deleteMany({ where: { userId } }),
      ...(ids.length > 0
        ? [this.prisma.userFacility.createMany({
            data: ids.map((fid) => ({ userId, facilitiesId: fid })),
            skipDuplicates: true,
          })]
        : []),
    ]);

    return this.getUserFacilities(userId);
  }

  // ---------------- me ----------------

  /**
   * Build the module-visibility view for a user. Returns the list of modules
   * they can see in the sidebar, plus per-action flags aggregated across all
   * their roles' role_permissions.
   *
   * Service requests get every active module with all actions granted.
   */
  async getMe(reqUser) {
    if (!reqUser) return null;

    if (reqUser.isService || reqUser.id === 'service-account') {
      const modules = await this.listModules({ activeOnly: true });
      return {
        user: { id: reqUser.id, email: reqUser.email, isService: true },
        roles: [],
        modules: modules.map((m) => ({
          ...m, canSelect: true, canInsert: true, canUpdate: true, canDelete: true,
        })),
        moduleIds: modules.map((m) => m.id),
        routePaths: modules.map((m) => m.routePath).filter(Boolean),
        isSuperAdmin: true,
      };
    }

    const userId = reqUser.id;
    const [user, userRoles, perms] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, username: true, displayName: true,
          avatarUrl: true, role: true, municipalityCode: true,
          fullName: true, contactNo: true, lastLoginAt: true,
        },
      }),
      this.prisma.userRole.findMany({
        where: { userId }, include: { role: true },
      }),
      this.prisma.rolePermission.findMany({
        where: {
          role: { userRoles: { some: { userId } } },
          OR: [{ canSelect: true }, { canInsert: true }, { canUpdate: true }, { canDelete: true }],
        },
        include: { module: true },
      }),
    ]);

    const isSuperAdmin = (userRoles || [])
      .some((ur) => (ur.role?.roleCode || '').toLowerCase() === 'super_admin');

    // Aggregate per-module permissions across all the user's role_permissions.
    const byModuleId = new Map();
    for (const rp of perms) {
      if (!rp.module || !rp.module.isActive) continue;
      const existing = byModuleId.get(rp.moduleId) || {
        ...presentModule(rp.module),
        canSelect: false, canInsert: false, canUpdate: false, canDelete: false,
      };
      for (const action of ACTIONS) {
        const col = ACTION_TO_COL[action];
        existing[col] = existing[col] || !!rp[col];
      }
      byModuleId.set(rp.moduleId, existing);
    }

    let modules = Array.from(byModuleId.values());
    if (isSuperAdmin) {
      // Super admin sees every active module, with all flags granted.
      const all = await this.listModules({ activeOnly: true });
      modules = all.map((m) => ({
        ...m, canSelect: true, canInsert: true, canUpdate: true, canDelete: true,
      }));
    }

    modules.sort((a, b) =>
      (a.category || '').localeCompare(b.category || '') ||
      (a.moduleName || '').localeCompare(b.moduleName || ''));

    return {
      user,
      roles: (userRoles || []).filter((ur) => ur.role).map((ur) => ({
        ...presentRole(ur.role),
        assignedAt: ur.createdAt,
      })),
      modules,
      moduleIds: modules.map((m) => m.id),
      routePaths: modules.map((m) => m.routePath).filter(Boolean),
      isSuperAdmin,
    };
  }
}

module.exports = RbacService;