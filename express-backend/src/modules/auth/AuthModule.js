const { asClass, asFunction } = require('awilix');
const ModuleContract = require('../../core/contracts/ModuleContract');
const AuthController = require('./AuthController');
const AuthService = require('./AuthService');
const createAuthRoutes = require('./AuthRoutes');

class AuthModule extends ModuleContract {
  get name() {
    return 'AuthModule';
  }

  register() {
    this.container.register({
      authController: asClass(AuthController).singleton(),
      authService: asClass(AuthService).singleton(),
      authRoutes: asFunction(createAuthRoutes).singleton(),
    });
  }

  init(app) {
    const authRoutes = this.container.resolve('authRoutes');
    app.use('/api/v1/auth', authRoutes);
  }
}

module.exports = AuthModule;
