const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../core/contracts/ModuleContract');
const UserController = require('./UserController');
const UserService = require('./UserService');
const createUserRoutes = require('./UserRoutes');

class UserModule extends ModuleContract {
  get name() {
    return 'UserModule';
  }

  register() {
    this.container.register({
      userController: asClass(UserController).singleton(),
      userService: asClass(UserService).singleton(),
      userRoutes: asFunction(createUserRoutes).singleton(),
    });
  }

  init(app) {
    const userRoutes = this.container.resolve('userRoutes');
    app.use('/api/v2/users', userRoutes); // Bind to v2 to show version compatibility
  }
}

module.exports = UserModule;
