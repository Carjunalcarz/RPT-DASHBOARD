const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../core/contracts/ModuleContract');
const RbacController = require('./RbacController');
const RbacService = require('./RbacService');
const createRbacRoutes = require('./RbacRoutes');

class RbacModule extends ModuleContract {
  get name() {
    return 'RbacModule';
  }

  register() {
    this.container.register({
      rbacController: asClass(RbacController).singleton(),
      rbacService: asClass(RbacService).singleton(),
      rbacRoutes: asFunction(createRbacRoutes).singleton(),
    });
  }

  init(app) {
    const rbacRoutes = this.container.resolve('rbacRoutes');
    app.use('/api/v1/rbac', rbacRoutes);
  }
}

module.exports = RbacModule;