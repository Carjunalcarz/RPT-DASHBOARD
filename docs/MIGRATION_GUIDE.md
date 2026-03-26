# Migration Guide: Monolith to Modular Architecture

## 1. Goal
This guide outlines the steps to migrate existing Express controllers and routes into the new Plugin-based Modular Architecture.

## 2. Step-by-Step Migration

### Step 1: Identify the Domain Boundary
Identify a cohesive set of routes, controllers, and services (e.g., `userController.js`, `authRoutes.js`). Group them into a logical domain (e.g., `AuthModule`).

### Step 2: Create the Module Directory
Create a directory under `src/modules/` for the domain (e.g., `src/modules/auth/`).

### Step 3: Refactor the Service Layer
Move business logic from the controller into a dedicated Service class. Inject dependencies (like `dbAdapter` or `logger`) through the constructor.
```javascript
class AuthService {
  constructor({ dbAdapter, logger }) {
    this.dbAdapter = dbAdapter;
    this.logger = logger;
  }
  // ... methods
}
```

### Step 4: Refactor the Controller
Convert the existing controller functions into a Class. Inject the required Service via the constructor.
```javascript
class AuthController {
  constructor({ authService }) {
    this.authService = authService;
  }
  // ... route handlers using arrow functions
}
```

### Step 5: Refactor Routes
Create a route factory function that accepts the Controller from the DI container.
```javascript
function createAuthRoutes({ authController }) {
  const router = require('express').Router();
  router.post('/login', authController.login);
  return router;
}
```

### Step 6: Create the Module Class
Implement the `ModuleContract` to register dependencies and mount routes.
```javascript
const ModuleContract = require('../../core/contracts/ModuleContract');

class AuthModule extends ModuleContract {
  get name() { return 'AuthModule'; }
  register() {
    this.container.register({
      authController: asClass(AuthController).singleton(),
      authService: asClass(AuthService).singleton(),
      authRoutes: asFunction(createAuthRoutes).singleton(),
    });
  }
  init(app) {
    const authRoutes = this.container.resolve('authRoutes');
    app.use('/api/v2/auth', authRoutes);
  }
}
```

### Step 7: Register in Server
Open `src/server.js`, import the module, and register it with the `PluginManager`.
```javascript
pluginManager.registerModule(AuthModule);
```

### Step 8: Version Compatibility Layer
To maintain backward compatibility, ensure the new routes use a `v2` prefix (e.g., `/api/v2/auth`). The legacy routes can remain untouched until the frontend is fully migrated.

### Step 9: Testing
Write unit tests for the Service, Controller, and Module initialization in `src/tests/modules/`. Use Awilix's `createContainer` to mock dependencies easily during testing.
