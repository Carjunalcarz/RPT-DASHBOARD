const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../core/contracts/ModuleContract');
const SystemAdminController = require('./SystemAdminController');
const SystemAdminService = require('./SystemAdminService');
const createSystemAdminRoutes = require('./SystemAdminRoutes');

class SystemAdminModule extends ModuleContract {
  get name() {
    return 'SystemAdminModule';
  }

  register() {
    this.container.register({
      systemAdminController: asClass(SystemAdminController).singleton(),
      systemAdminService: asClass(SystemAdminService).singleton(),
      systemAdminRoutes: asFunction(createSystemAdminRoutes).singleton(),
    });
  }

  init(app) {
    const routes = this.container.resolve('systemAdminRoutes');
    app.use('/api/v1/system-admin', routes);
  }
}

module.exports = SystemAdminModule;
