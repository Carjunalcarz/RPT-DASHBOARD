/**
 * Base contract that all modules must implement.
 */
class ModuleContract {
  /**
   * @param {Object} container - The DI container
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Return the module name
   * @returns {string}
   */
  get name() {
    throw new Error('Module must implement get name()');
  }

  /**
   * Register dependencies into the DI container
   */
  register() {
    // Optional to implement
  }

  /**
   * Initialize routes or attach to the express app
   * @param {import('express').Application} app
   */
  init(app) {
    // Optional to implement
  }
}

module.exports = ModuleContract;
