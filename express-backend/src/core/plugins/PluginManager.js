const logger = require('../../utils/logger');

class PluginManager {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.modules = new Map();
  }

  /**
   * Register a module
   * @param {typeof import('../contracts/ModuleContract')} ModuleClass
   */
  registerModule(ModuleClass) {
    const moduleInstance = new ModuleClass(this.container);
    logger.info(`Registering module: ${moduleInstance.name}`);
    
    // Register dependencies
    moduleInstance.register();
    
    this.modules.set(moduleInstance.name, moduleInstance);
  }

  /**
   * Initialize all registered modules
   */
  initializeModules() {
    for (const [name, moduleInstance] of this.modules.entries()) {
      logger.info(`Initializing module: ${name}`);
      moduleInstance.init(this.app);
    }
  }
}

module.exports = PluginManager;
