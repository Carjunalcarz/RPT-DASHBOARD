const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../../core/contracts/ModuleContract');
const OopController = require('./OopController');
const OopService = require('./OopService');
const createOopRoutes = require('./OopRoutes');

class OopModule extends ModuleContract {
  get name() {
    return 'OopModule';
  }

  register() {
    this.container.register({
      oopController: asClass(OopController).singleton(),
      oopService: asClass(OopService).singleton(),
      oopRoutes: asFunction(createOopRoutes).singleton(),
    });
  }

  init(app) {
    const oopRoutes = this.container.resolve('oopRoutes');
    app.use('/api/v2/oop', oopRoutes);
  }
}

module.exports = OopModule;
