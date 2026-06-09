/**
 * Module-visibility route guards backed by the live Supabase RBAC schema
 * (roles, role_permissions, modules, user_roles).
 *
 * A user has "access" to a module if any of their role_permissions rows for
 * that module has any can_* flag set to true. Action-level guards
 * (requireAction) check the specific can_<action> flag.
 *
 * Usage:
 *   router.get('/faas',
 *     authenticate,
 *     requireModule('/rptas/faas-records'),       // by route_path
 *     controller.list);
 *
 *   router.post('/faas',
 *     authenticate,
 *     requireAction('/rptas/faas-records', 'insert'),
 *     controller.create);
 *
 *   requireAnyModule('/rptas', '/accounting')      // OR semantics
 *
 * Service-to-service requests (req.isServiceRequest === true) bypass the
 * check entirely — the legacy API key is considered trusted.
 *
 * Permissions are cached per-user for `TTL_MS`. Mutating user_roles or
 * role_permissions should call invalidateUserPermissions(userId) to evict.
 */

const { AppError } = require('./errorHandler');
const { supabasePrisma } = require('../modules/rptas/database/prisma');
const logger = require('../utils/logger');

const TTL_MS = 30 * 1000;

// cache: userId -> { perms: Map<moduleId, {select,insert,update,delete}>,
//                    routes: Map<routePath, moduleId>,
//                    isSuperAdmin: boolean,
//                    expires: number }
const cache = new Map();

function looksLikeUuid(s) {
  return typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function loadUserAccess(userId) {
  const empty = { perms: new Map(), routes: new Map(), isSuperAdmin: false };
  if (!userId || !looksLikeUuid(userId)) return empty;

  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && hit.expires > now) return hit;

  try {
    // Read through Prisma (same client/models/schema as RbacService.getMe and
    // the ensureSuperAdmin promotion) rather than raw SQL against public.*.
    // The RBAC tables are Prisma-mapped to the `admin_setup` schema; a raw
    // query hardcoding `public.` reads a stale, type-mismatched copy and never
    // sees role assignments written by the rest of the system.
    const [userRoles, rolePerms] = await Promise.all([
      supabasePrisma.userRole.findMany({
        where: { userId },
        include: { role: true },
      }),
      supabasePrisma.rolePermission.findMany({
        where: { role: { userRoles: { some: { userId } } } },
        include: { module: true },
      }),
    ]);

    const isSuperAdmin = (userRoles || []).some(
      (ur) => (ur.role?.roleCode || '').toLowerCase() === 'super_admin',
    );

    const perms = new Map();
    const routes = new Map();

    for (const rp of rolePerms || []) {
      if (!rp.module || !rp.module.isActive) continue;
      const prev = perms.get(rp.moduleId) || {
        canSelect: false,
        canInsert: false,
        canUpdate: false,
        canDelete: false,
      };
      prev.canSelect = prev.canSelect || !!rp.canSelect;
      prev.canInsert = prev.canInsert || !!rp.canInsert;
      prev.canUpdate = prev.canUpdate || !!rp.canUpdate;
      prev.canDelete = prev.canDelete || !!rp.canDelete;
      perms.set(rp.moduleId, prev);
      if (rp.module.routePath) routes.set(rp.module.routePath, rp.moduleId);
    }

    const entry = { perms, routes, isSuperAdmin, expires: now + TTL_MS };
    cache.set(userId, entry);
    return entry;
  } catch (err) {
    logger.error(`Failed to load access for user ${userId}: ${err.message}`);
    return empty;
  }
}

function invalidateUserPermissions(userId) {
  if (userId === undefined || userId === null) cache.clear();
  else cache.delete(String(userId));
}

function hasAnyAccess(access, key) {
  // Resolve key (either a module id or a route_path) to access flags.
  let p = access.perms.get(key);
  if (!p) {
    const moduleId = access.routes.get(key);
    if (moduleId) p = access.perms.get(moduleId);
  }
  if (!p) return false;
  return p.canSelect || p.canInsert || p.canUpdate || p.canDelete;
}

function hasAction(access, key, action) {
  let p = access.perms.get(key);
  if (!p) {
    const moduleId = access.routes.get(key);
    if (moduleId) p = access.perms.get(moduleId);
  }
  if (!p) return false;
  switch (action) {
    case 'select': return !!p.canSelect;
    case 'insert': return !!p.canInsert;
    case 'update': return !!p.canUpdate;
    case 'delete': return !!p.canDelete;
    default: return false;
  }
}

function _moduleGuard(keys, mode) {
  const list = keys.flat().filter(Boolean).map(String);
  if (list.length === 0) {
    throw new Error('requireModule: at least one module id or route_path is required');
  }
  return async (req, res, next) => {
    try {
      if (req.isServiceRequest) return next();
      if (!req.user?.id) return next(new AppError('Authentication required', 401));

      const access = await loadUserAccess(req.user.id);
      if (access.isSuperAdmin) return next();

      if (mode === 'any') {
        if (list.some((k) => hasAnyAccess(access, k))) return next();
        return next(new AppError(
          `Requires access to any of: ${list.join(', ')}`, 403
        ));
      }

      const missing = list.filter((k) => !hasAnyAccess(access, k));
      if (missing.length === 0) return next();
      return next(new AppError(
        `Missing module access: ${missing.join(', ')}`, 403
      ));
    } catch (err) {
      next(err);
    }
  };
}

function requireAction(key, action) {
  if (!key || !action) {
    throw new Error('requireAction(moduleKey, action) requires both arguments');
  }
  if (!['select', 'insert', 'update', 'delete'].includes(action)) {
    throw new Error(`requireAction: action must be one of select|insert|update|delete (got ${action})`);
  }
  return async (req, res, next) => {
    try {
      if (req.isServiceRequest) return next();
      if (!req.user?.id) return next(new AppError('Authentication required', 401));

      const access = await loadUserAccess(req.user.id);
      if (access.isSuperAdmin) return next();
      if (hasAction(access, key, action)) return next();

      return next(new AppError(
        `Requires '${action}' on module ${key}`, 403
      ));
    } catch (err) {
      next(err);
    }
  };
}

const requireModule = (...keys) => _moduleGuard(keys, 'all');
const requireAnyModule = (...keys) => _moduleGuard(keys, 'any');

// Back-compat aliases — older code may still import requirePermission.
const requirePermission = requireModule;
const requireAnyPermission = requireAnyModule;

module.exports = {
  requireModule,
  requireAnyModule,
  requireAction,
  requirePermission,
  requireAnyPermission,
  loadUserAccess,
  invalidateUserPermissions,
};