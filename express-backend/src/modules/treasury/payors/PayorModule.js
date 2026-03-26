const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../../core/contracts/ModuleContract');
const PayorController = require('./PayorController');
const PayorService = require('./PayorService');
const createPayorRoutes = require('./PayorRoutes');

class PayorModule extends ModuleContract {
  get name() {
    return 'PayorModule';
  }

  register() {
    this.container.register({
      payorController: asClass(PayorController).singleton(),
      payorService: asClass(PayorService).singleton(),
      payorRoutes: asFunction(createPayorRoutes).singleton(),
    });
  }

  init(app) {
    const payorRoutes = this.container.resolve('payorRoutes');
    app.use('/api/v2/payors', payorRoutes);
  }
}

module.exports = PayorModule;
