const { createContainer, asValue } = require('awilix');
const HealthModule = require('../../modules/health/HealthModule');

describe('HealthModule', () => {
  let container;
  let app;

  beforeEach(() => {
    container = createContainer();
    app = { use: jest.fn() };
    
    // Mock dbAdapter
    container.register({
      dbAdapter: asValue({
        getClient: () => ({ $queryRaw: jest.fn().mockResolvedValue([1]) })
      })
    });
  });

  it('should register dependencies and initialize routes', () => {
    const healthModule = new HealthModule(container);
    healthModule.register();

    expect(container.hasRegistration('healthController')).toBe(true);
    expect(container.hasRegistration('healthService')).toBe(true);
    expect(container.hasRegistration('healthRoutes')).toBe(true);

    healthModule.init(app);
    expect(app.use).toHaveBeenCalledWith('/api/v2/health', expect.any(Function));
  });
});
