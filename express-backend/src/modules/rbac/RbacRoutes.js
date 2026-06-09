const { Router } = require('express');
const { authenticate } = require('../../middleware/authIdentity');

// RBAC admin routes are gated by membership in any role whose role_code is
// 'super_admin'. We don't use requireModule here because the live module
// catalog doesn't define a single "manage RBAC" entry, and adding one would
// be a schema-level seed choice for the user — not us. The middleware's
// super_admin short-circuit handles it.
const requireSuperAdmin = require('./requireSuperAdmin');

function createRbacRoutes({ rbacController: c }) {
  const r = Router();

  r.use(authenticate);

  // Anyone signed in: own profile + module catalog
  r.get('/me',       c.getMe);
  r.get('/modules',  c.listModules);

  // Module CRUD — super_admin only
  r.post  ('/modules',     requireSuperAdmin, c.createModule);
  r.patch ('/modules/:id', requireSuperAdmin, c.updateModule);
  r.delete('/modules/:id', requireSuperAdmin, c.deleteModule);

  // Role management — super_admin only
  r.get   ('/roles',                       requireSuperAdmin, c.listRoles);
  r.get   ('/roles/:id',                   requireSuperAdmin, c.getRole);
  r.post  ('/roles',                       requireSuperAdmin, c.createRole);
  r.patch ('/roles/:id',                   requireSuperAdmin, c.updateRole);
  r.delete('/roles/:id',                   requireSuperAdmin, c.deleteRole);
  r.put   ('/roles/:id/modules',           requireSuperAdmin, c.setRoleModules);
  r.put   ('/roles/:roleId/modules/:moduleId',    requireSuperAdmin, c.upsertRoleModule);
  r.delete('/roles/:roleId/modules/:moduleId',    requireSuperAdmin, c.removeRoleModule);

  // User <-> role assignments — super_admin only
  r.get   ('/users/:userId/roles',                 requireSuperAdmin, c.getUserRoles);
  r.put   ('/users/:userId/roles',                 requireSuperAdmin, c.setUserRoles);
  r.post  ('/users/:userId/roles/:roleId',         requireSuperAdmin, c.assignRoleToUser);
  r.delete('/users/:userId/roles/:roleId',         requireSuperAdmin, c.revokeRoleFromUser);

  // Facilities — super_admin only
  r.get   ('/facilities',                          requireSuperAdmin, c.listFacilities);
  r.post  ('/facilities',                          requireSuperAdmin, c.createFacility);
  r.patch ('/facilities/:id',                      requireSuperAdmin, c.updateFacility);
  r.delete('/facilities/:id',                      requireSuperAdmin, c.deleteFacility);

  // User <-> facility assignments
  r.get   ('/users/:userId/facilities',            requireSuperAdmin, c.getUserFacilities);
  r.put   ('/users/:userId/facilities',            requireSuperAdmin, c.setUserFacilities);

  return r;
}

module.exports = createRbacRoutes;