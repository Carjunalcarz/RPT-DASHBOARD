# System Architecture Specification

## 1. Overview
The monolithic backend is transitioning into a Modular Plugin Architecture. This architecture uses Dependency Injection (DI) via `awilix`, promoting SOLID principles, testability, and seamless integration of external systems.

## 2. Core Concepts
### 2.1 Plugin Manager
Located at `src/core/plugins/PluginManager.js`, this class is responsible for bootstrapping the application by registering and initializing independent modules. Each module encapsulates its own routes, controllers, services, and business logic.

### 2.2 Dependency Injection (DI) Container
Located at `src/core/di/container.js`, the DI container manages the lifecycle of all services, adapters, and configuration objects. Modules register their dependencies into this central container.

### 2.3 Module Contracts
All modules MUST extend `ModuleContract` (`src/core/contracts/ModuleContract.js`). A valid module implements:
- `get name()`: Returns the unique name of the module.
- `register()`: Registers the module's controllers, services, and routes into the DI container.
- `init(app)`: Attaches the module's routes to the Express application.

### 2.4 Integration Adapters
To support multiple databases (Supabase, MSSQL) and external APIs, the system uses adapters (e.g., `DatabaseAdapter`). Adapters abstract the underlying implementation, allowing services to interact with interfaces rather than concrete third-party SDKs.

## 3. Directory Structure
```
src/
├── core/
│   ├── adapters/      # Interfaces and implementations for external systems
│   ├── config/        # Environment and configuration management
│   ├── contracts/     # Base classes and interfaces
│   ├── di/            # Awilix container setup
│   └── plugins/       # Plugin Manager
├── modules/
│   ├── health/        # Example module
│   └── users/         # Refactored user module
└── server.js          # Entry point
```

## 4. How to Create a New Module
1. Create a folder in `src/modules/` (e.g., `inventory`).
2. Define the Controller, Service, and Routes.
3. Create an `InventoryModule.js` extending `ModuleContract`.
4. Register the module in `src/server.js` using `pluginManager.registerModule(InventoryModule)`.
