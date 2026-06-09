class RbacController {
  constructor({ rbacService }) {
    this.svc = rbacService;
  }

  // GET /me  -> { user, roles, modules, moduleIds, routePaths, isSuperAdmin }
  getMe = async (req, res, next) => {
    try {
      // Force-admin bootstrap: when the deployment explicitly opts in
      // (backend ALLOW_FORCE_ADMIN=true) AND the client signals it's running
      // with the VITE_FORCE_ADMIN dev flag (x-force-admin header), PERSIST a
      // real super_admin role for the authenticated user. Gated by the backend
      // env var so a client header alone can never self-promote, and skipped
      // for service-account (x-api-key) requests since there's no real user.
      if (
        process.env.ALLOW_FORCE_ADMIN === 'true' &&
        req.headers['x-force-admin'] === 'true' &&
        req.user &&
        !req.user.isService &&
        req.user.id
      ) {
        await this.svc.ensureSuperAdmin(req.user.id);
      }
      const data = await this.svc.getMe(req.user);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /modules?all=1
  listModules = async (req, res, next) => {
    try {
      const activeOnly = req.query.all !== '1' && req.query.all !== 'true';
      const data = await this.svc.listModules({ activeOnly });
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /modules
  createModule = async (req, res, next) => {
    try {
      const data = await this.svc.createModule(req.body || {});
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PATCH /modules/:id
  updateModule = async (req, res, next) => {
    try {
      const data = await this.svc.updateModule(req.params.id, req.body || {});
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // DELETE /modules/:id
  deleteModule = async (req, res, next) => {
    try {
      const data = await this.svc.deleteModule(req.params.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /roles
  listRoles = async (req, res, next) => {
    try {
      const data = await this.svc.listRoles();
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /roles/:id
  getRole = async (req, res, next) => {
    try {
      const data = await this.svc.getRole(req.params.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /roles  { roleCode, roleName }
  createRole = async (req, res, next) => {
    try {
      const data = await this.svc.createRole(req.body || {});
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PATCH /roles/:id  { roleCode?, roleName? }
  updateRole = async (req, res, next) => {
    try {
      const data = await this.svc.updateRole(req.params.id, req.body || {});
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // DELETE /roles/:id
  deleteRole = async (req, res, next) => {
    try {
      const data = await this.svc.deleteRole(req.params.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PUT /roles/:id/modules
  //   { modules: ["<moduleId>", ...] }            -> grants full CRUD
  //   { modules: [{ moduleId, canSelect, canInsert, canUpdate, canDelete }] }
  setRoleModules = async (req, res, next) => {
    try {
      const items = Array.isArray(req.body?.modules)
        ? req.body.modules
        : Array.isArray(req.body?.moduleIds)
          ? req.body.moduleIds
          : [];
      const data = await this.svc.setRoleModules(req.params.id, items);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PUT /roles/:roleId/modules/:moduleId  body: { canSelect?, canInsert?, canUpdate?, canDelete? }
  upsertRoleModule = async (req, res, next) => {
    try {
      const data = await this.svc.upsertRoleModule(
        req.params.roleId,
        req.params.moduleId,
        req.body || {},
      );
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // DELETE /roles/:roleId/modules/:moduleId
  removeRoleModule = async (req, res, next) => {
    try {
      const data = await this.svc.removeRoleModule(
        req.params.roleId,
        req.params.moduleId,
      );
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /users/:userId/roles
  getUserRoles = async (req, res, next) => {
    try {
      const data = await this.svc.getUserRoles(req.params.userId);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PUT /users/:userId/roles  { roleIds: [] }
  setUserRoles = async (req, res, next) => {
    try {
      const ids = Array.isArray(req.body?.roleIds) ? req.body.roleIds : [];
      const data = await this.svc.setUserRoles(req.params.userId, ids);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /users/:userId/roles/:roleId
  assignRoleToUser = async (req, res, next) => {
    try {
      const data = await this.svc.assignRoleToUser(
        req.params.userId, req.params.roleId
      );
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // DELETE /users/:userId/roles/:roleId
  revokeRoleFromUser = async (req, res, next) => {
    try {
      const data = await this.svc.revokeRoleFromUser(
        req.params.userId, req.params.roleId
      );
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // ---------------- facilities ----------------

  // GET /facilities?active=1
  listFacilities = async (req, res, next) => {
    try {
      const activeOnly = req.query.active === '1' || req.query.active === 'true';
      const data = await this.svc.listFacilities({ activeOnly });
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /facilities { facilityName, isActive? }
  createFacility = async (req, res, next) => {
    try {
      const data = await this.svc.createFacility(req.body || {});
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PATCH /facilities/:id { facilityName?, isActive? }
  updateFacility = async (req, res, next) => {
    try {
      const data = await this.svc.updateFacility(req.params.id, req.body || {});
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // DELETE /facilities/:id
  deleteFacility = async (req, res, next) => {
    try {
      const data = await this.svc.deleteFacility(req.params.id);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /users/:userId/facilities
  getUserFacilities = async (req, res, next) => {
    try {
      const data = await this.svc.getUserFacilities(req.params.userId);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // PUT /users/:userId/facilities  body: { facilityIds: [] }
  setUserFacilities = async (req, res, next) => {
    try {
      const ids = Array.isArray(req.body?.facilityIds)
        ? req.body.facilityIds
        : Array.isArray(req.body?.facilities)
          ? req.body.facilities
          : [];
      const data = await this.svc.setUserFacilities(req.params.userId, ids);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };
}

module.exports = RbacController;