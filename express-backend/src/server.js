const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

// Load environment variables
dotenv.config();

// Imports
const { errorHandler } = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const idempotency = require('./middleware/idempotency');
const logger = require('./utils/logger');
const { runSupabaseStartupMigrations } = require('./modules/rptas/database/startupMigrations');

const app = express();

// --- DI and Plugin Manager Setup ---
const container = require('./core/di/container');
const PluginManager = require('./core/plugins/PluginManager');
const HealthModule = require('./modules/health/HealthModule');
const UserModule = require('./modules/users/UserModule');
const FaasModule = require('./modules/rptas/faas/FaasModule');
const PropertyModule = require('./modules/rptas/property/PropertyModule');
const AssessmentModule = require('./modules/rptas/assessment/AssessmentModule');
const OopModule = require('./modules/treasury/oop/OopModule');
const PayorModule = require('./modules/treasury/payors/PayorModule');

// Initialize Database Adapter
const dbAdapter = container.resolve('dbAdapter');
// We don't block the app startup, but we connect to the DB
dbAdapter.connect().catch(err => logger.error('DB Connection error', err));

const pluginManager = new PluginManager(container, app);
pluginManager.registerModule(HealthModule);
pluginManager.registerModule(UserModule);
pluginManager.registerModule(FaasModule);
pluginManager.registerModule(PropertyModule);
pluginManager.registerModule(AssessmentModule);
pluginManager.registerModule(OopModule);
pluginManager.registerModule(PayorModule);
// Initialize all v2 modules
pluginManager.initializeModules();
// -----------------------------------

// Trust Proxy (for rate limiting and IP logging)
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS
const whitelist = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Required for cookies
};
app.use(cors(corsOptions));

// Rate Limiting
app.use(rateLimiter);

// Request Logging
app.use(requestLogger);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Idempotency
app.use(idempotency);

// Debug Middleware to trace Cookie/Token flow (After Cookie Parser)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[${req.method} ${req.url}] Cookies: ${JSON.stringify(req.cookies || {})} | API Key: ${req.headers['x-api-key'] ? 'Present' : 'Missing'}`);
  }
  next();
});

// Swagger Documentation
const swaggerServerUrl = process.env.SWAGGER_SERVER_URL || '/';
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RPT Dashboard API',
      version: '1.0.0',
      description: 'API for RPT Dashboard with MSSQL and Supabase support',
    },
    servers: [
      {
        url: swaggerServerUrl,
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      { cookieAuth: [] },
      { ApiKeyAuth: [] },
      { bearerAuth: [] },
    ],
  },
  apis: [path.join(__dirname, './modules/rptas/routes/*.js').replace(/\\/g, '/')], // Path to the API docs (normalized for Windows)
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
logger.info(`Swagger Docs loaded: ${Object.keys(swaggerDocs.paths || {}).length} paths found`);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocs);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  explorer: false, // Disabled explorer bar to avoid confusion
  swaggerOptions: {
    filter: true,
    displayRequestDuration: true,
    docExpansion: "list",
    persistAuthorization: true,
    tryItOutEnabled: true,
  },
  customSiteTitle: "RPT Dashboard API Docs",
  customCss: '.swagger-ui .topbar { display: block }',
  customJs: '/swagger-init.js'
}));

// Serve custom JS file for Swagger UI injection
app.get('/swagger-init.js', (req, res) => {
  res.type('application/javascript');
  res.send(`
    window.addEventListener('load', function() {
      setTimeout(function() {
        if (window.ui) {
          window.ui.preauthorizeApiKey("ApiKeyAuth", "${process.env.API_ACCESS_KEY || ''}");
        }
      }, 500);
    });
  `);
});

// Routes
const rptasRoutes = require('./modules/rptas/routes');

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/ready', async (req, res) => {
  try {
    const client = dbAdapter.getClient();
    await client.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error' });
  }
});

app.use('/', rptasRoutes);

// Legacy routes support if needed

// Error Handler
app.use(errorHandler);

// Start Server if not imported (for testing)
if (require.main === module) {
  (async () => {
    await runSupabaseStartupMigrations();

    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', err);
      server.close(() => {
        process.exit(1);
      });
    });
  })();
}

module.exports = app;
