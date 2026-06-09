/**
 * Role-based authorization guard.
 *
 *   router.post('/admin-only', authenticate, requireRole('admin'), handler);
 *   router.put ('/either',     authenticate, requireRole('admin','user'), handler);
 *
 * Service-to-service requests (req.isServiceRequest === true — i.e. the
 * legacy x-api-key path) bypass the check entirely. This matches the
 * convention used by requirePermission / requireSuperAdmin.
 *
 * Source of truth for the user's role is req.user.role — populated by the
 * authenticate middleware in authIdentity.js from public.users.role or, if
 * that lookup fails, from the JWT claim or the default 'user'.
 */

const { AppError } = require('./errorHandler');

function requireRole(...allowed) {
  const list = allowed.flat().filter(Boolean).map((r) => String(r).toLowerCase());
  if (list.length === 0) {
    throw new Error('requireRole: at least one role is required');
  }
  return (req, res, next) => {
    if (req.isServiceRequest) return next();
    if (!req.user?.id) return next(new AppError('Authentication required', 401));

    const userRole = String(req.user.role || '').toLowerCase();
    if (list.includes(userRole)) return next();

    return next(new AppError(
      `Requires role: ${list.join(' or ')}`, 403
    ));
  };
}

module.exports = { requireRole };
