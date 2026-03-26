const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../../core/contracts/ModuleContract');
const PropertyController = require('./PropertyController');
const PropertyService = require('./PropertyService');
const createPropertyRoutes = require('./PropertyRoutes');

class PropertyModule extends ModuleContract {
  get name() {
    return 'PropertyModule';
  }

  register() {
    this.container.register({
      propertyController: asClass(PropertyController).singleton(),
      propertyService: asClass(PropertyService).singleton(),
      propertyRoutes: asFunction(createPropertyRoutes).singleton(),
    });
  }

  init(app) {
    const propertyRoutes = this.container.resolve('propertyRoutes');
    app.use('/api/v2/property', propertyRoutes);
  }
}

module.exports = PropertyModule;
