const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../../core/contracts/ModuleContract');
const FaasController = require('./FaasController');
const FaasService = require('./FaasService');
const createFaasRoutes = require('./FaasRoutes');

class FaasModule extends ModuleContract {
  get name() {
    return 'FaasModule';
  }

  register() {
    this.container.register({
      faasController: asClass(FaasController).singleton(),
      faasService: asClass(FaasService).singleton(),
      faasRoutes: asFunction(createFaasRoutes).singleton(),
    });
  }

  init(app) {
    const faasRoutes = this.container.resolve('faasRoutes');
    app.use('/api/v2/faas', faasRoutes);
  }
}

module.exports = FaasModule;
