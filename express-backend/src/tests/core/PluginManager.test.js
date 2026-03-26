const { createContainer } = require('awilix');
const PluginManager = require('../../core/plugins/PluginManager');
const ModuleContract = require('../../core/contracts/ModuleContract');

describe('PluginManager', () => {
  let container;
  let app;
  let pluginManager;

  beforeEach(() => {
    container = createContainer();
    app = { use: jest.fn() };
    pluginManager = new PluginManager(container, app);
  });

  it('should register and initialize a module', () => {
    class TestModule extends ModuleContract {
      get name() { return 'TestModule'; }
      register() {
        this.container.register({
          testVal: require('awilix').asValue('hello'),
        });
      }
      init(expressApp) {
        expressApp.use('/test', (req, res) => res.send(this.container.resolve('testVal')));
      }
    }

    pluginManager.registerModule(TestModule);
    
    expect(pluginManager.modules.has('TestModule')).toBe(true);
    expect(container.resolve('testVal')).toBe('hello');

    pluginManager.initializeModules();
    expect(app.use).toHaveBeenCalledWith('/test', expect.any(Function));
  });
});
