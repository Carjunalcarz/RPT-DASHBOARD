const { AppError } = require('../../middleware/errorHandler');
const { loadUserAccess } = require('../../middleware/requirePermission');

/**
 * Guard that allows only users who hold a role with role_code='super_admin'.
 * Service-to-service requests (legacy API key) are allowed through.
 */
module.exports = async function requireSuperAdmin(req, res, next) {
  try {
    if (req.isServiceRequest) return next();
    if (!req.user?.id) return next(new AppError('Authentication required', 401));

    const access = await loadUserAccess(req.user.id);
    if (access.isSuperAdmin) return next();
    return next(new AppError('Super-admin role required', 403));
  } catch (err) {
    next(err);
  }
};