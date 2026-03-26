const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../core/contracts/ModuleContract');
const HealthController = require('./HealthController');
const HealthService = require('./HealthService');
const createHealthRoutes = require('./HealthRoutes');

class HealthModule extends ModuleContract {
  get name() {
    return 'HealthModule';
  }

  register() {
    this.container.register({
      healthController: asClass(HealthController).singleton(),
      healthService: asClass(HealthService).singleton(),
      healthRoutes: asFunction(createHealthRoutes).singleton(),
    });
  }

  init(app) {
    const healthRoutes = this.container.resolve('healthRoutes');
    app.use('/api/v2/health', healthRoutes); // Version 2 for the refactored endpoints
  }
}

module.exports = HealthModule;
