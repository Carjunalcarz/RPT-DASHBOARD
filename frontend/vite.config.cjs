const path = require('path');
const express = require('express');
const { defineConfig, loadEnv } = require('vite');

const createHealthTracker = () => {
  const status = {
    state: 'idle',
    errors: [],
    warnings: [],
    lastCompileTime: null,
    lastSuccessTime: null,
    compileDuration: 0,
    totalCompiles: 0,
    firstCompileTime: null,
  };

  const setCompiling = () => {
    const now = Date.now();
    status.state = 'compiling';
    status.lastCompileTime = now;
    if (!status.firstCompileTime) {
      status.firstCompileTime = now;
    }
  };

  const setSuccess = () => {
    const now = Date.now();
    status.state = 'success';
    status.lastSuccessTime = now;
    status.errors = [];
    status.warnings = [];
    status.compileDuration = status.lastCompileTime ? now - status.lastCompileTime : 0;
    status.totalCompiles += 1;
  };

  const setFailed = (error) => {
    const now = Date.now();
    status.state = 'failed';
    status.errors = [
      {
        message: error?.message || String(error || 'Unknown error'),
        stack: error?.stack,
      },
    ];
    status.compileDuration = status.lastCompileTime ? now - status.lastCompileTime : 0;
    status.totalCompiles += 1;
  };

  const getStatus = () => ({
    ...status,
    isHealthy: status.state === 'success',
    errorCount: status.errors.length,
    warningCount: status.warnings.length,
    hasCompiled: status.totalCompiles > 0,
  });

  const getSimpleStatus = () => ({
    state: status.state,
    isHealthy: status.state === 'success',
    errorCount: status.errors.length,
    warningCount: status.warnings.length,
  });

  return {
    setCompiling,
    setSuccess,
    setFailed,
    getStatus,
    getSimpleStatus,
  };
};

const resolveModule = (moduleValue) => moduleValue?.default ?? moduleValue;

const visualEditsPlugin = (setupDevServer) => ({
  name: 'visual-edits',
  configureServer(server) {
    if (!setupDevServer) return;
    const app = express();
    const config = setupDevServer({});
    if (config && typeof config.setupMiddlewares === 'function') {
      config.setupMiddlewares([], { app });
    }
    server.middlewares.use(app);
  },
});

const healthCheckPlugin = (setupHealthEndpoints) => {
  if (!setupHealthEndpoints) return null;
  const tracker = createHealthTracker();
  let successTimer;

  const scheduleSuccess = () => {
    if (successTimer) clearTimeout(successTimer);
    successTimer = setTimeout(() => tracker.setSuccess(), 200);
  };

  return {
    name: 'health-check',
    configureServer(server) {
      const app = express();
      setupHealthEndpoints({ app }, tracker);
      server.middlewares.use(app);
      tracker.setSuccess();

      const onChange = () => {
        tracker.setCompiling();
        scheduleSuccess();
      };

      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
    handleHotUpdate() {
      tracker.setCompiling();
      scheduleSuccess();
    },
    buildStart() {
      tracker.setCompiling();
    },
    buildEnd(error) {
      if (error) {
        tracker.setFailed(error);
      } else {
        tracker.setSuccess();
      }
    },
  };
};

module.exports = defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isVitest = process.env.VITEST === 'true';
  const enableHealthCheck = env.ENABLE_HEALTH_CHECK === 'true' && command === 'serve' && !isVitest;
  const enableVisualEdits = env.ENABLE_VISUAL_EDITS === 'true' && command === 'serve' && !isVitest;
  const reactModule = await import('@vitejs/plugin-react');
  const react = resolveModule(reactModule);

  const setupDevServer = enableVisualEdits
    ? resolveModule(require('./plugins/visual-edits/dev-server-setup.js'))
    : null;
  const babelMetadataPlugin = enableVisualEdits
    ? resolveModule(require('./plugins/visual-edits/babel-metadata-plugin.js'))
    : null;
  const setupHealthEndpoints = enableHealthCheck
    ? resolveModule(require('./plugins/health-check/health-endpoints.js'))
    : null;

  return {
    base: './',
    plugins: [
      react({
        babel: enableVisualEdits && babelMetadataPlugin ? { plugins: [babelMetadataPlugin] } : undefined,
      }),
      visualEditsPlugin(setupDevServer),
      healthCheckPlugin(setupHealthEndpoints),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      },
    },
  };
});
