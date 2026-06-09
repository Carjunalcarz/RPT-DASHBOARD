const { Router } = require('express');
const { authenticate } = require('../../middleware/authIdentity');
const { AppError } = require('../../middleware/errorHandler');
const { loadUserAccess } = require('../../middleware/requirePermission');

/**
 * Bootstrap-aware gate.
 *
 * Allows the request if EITHER:
 *   - it's a service request (x-api-key matches API_ACCESS_KEY), OR
 *   - the user holds a super_admin role.
 *
 * Important: on the very first run the RBAC schema may not exist yet, so no
 * user can be super_admin and only the service API key works. After init,
 * super_admins can also use these endpoints from the dashboard via JWT.
 */
async function requireServiceOrSuperAdmin(req, res, next) {
  try {
    if (req.isServiceRequest) return next();
    if (!req.user?.id) return next(new AppError('Authentication required', 401));

    const access = await loadUserAccess(req.user.id);
    if (access.isSuperAdmin) return next();

    return next(new AppError(
      'super_admin role or service API key required', 403
    ));
  } catch (err) {
    next(err);
  }
}

function createSystemAdminRoutes({ systemAdminController: c }) {
  const r = Router();
  r.use(authenticate);
  r.use(requireServiceOrSuperAdmin);

  // Setup status / init — both accept ?schema=foo / { schema: 'foo' }
  r.get ('/setup/status',      c.getStatus);
  r.post('/setup/init',        c.runSetup);
  r.post('/setup/seed-rptas',  c.seedRptasModules);

  // Schema management
  r.get ('/schemas', c.listSchemas);
  r.post('/schemas', c.createSchema);

  return r;
}

module.exports = createSystemAdminRoutes;
