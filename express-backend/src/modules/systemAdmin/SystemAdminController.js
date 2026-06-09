class SystemAdminController {
  constructor({ systemAdminService }) {
    this.svc = systemAdminService;
  }

  // GET /setup/status?schema=foo
  getStatus = async (req, res, next) => {
    try {
      const schema = req.query.schema
        ? String(req.query.schema)
        : undefined;
      const data = await this.svc.getSetupStatus(schema);
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /setup/init
  //   body: { schema?: string, dryRun?: boolean, forceReset?: boolean }
  //
  // forceReset is destructive — it drops the RBAC tables before re-creating
  // them. Used to recover from an earlier botched init (e.g. text-typed id
  // columns blocking foreign-key constraints).
  runSetup = async (req, res, next) => {
    try {
      const schema = req.body?.schema || req.query.schema;
      const dryRun =
        req.query.dryRun === '1' ||
        req.query['dry-run'] === '1' ||
        req.body?.dryRun === true;
      const forceReset = req.body?.forceReset === true;
      const data = await this.svc.runSetup({ schema, dryRun, forceReset });
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // GET /schemas
  listSchemas = async (req, res, next) => {
    try {
      const data = await this.svc.listSchemas();
      res.json({
        status: 'success',
        data: {
          schemas: data,
          configured: this.svc.configuredSchema,
        },
      });
    } catch (e) { next(e); }
  };

  // POST /setup/seed-rptas?dry-run=1
  seedRptasModules = async (req, res, next) => {
    try {
      const dryRun =
        req.query.dryRun === '1' ||
        req.query['dry-run'] === '1' ||
        req.body?.dryRun === true;
      const data = await this.svc.seedRptasModules({ dryRun });
      res.json({ status: 'success', data });
    } catch (e) { next(e); }
  };

  // POST /schemas  body: { name: string }
  createSchema = async (req, res, next) => {
    try {
      const name = req.body?.name;
      if (!name) {
        return res.status(400).json({
          status: 'error',
          message: 'name is required',
        });
      }
      const data = await this.svc.createSchema(name);
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  };
}

module.exports = SystemAdminController;
