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
const logger = require('./utils/logger');
const healthRoutes = require('./routes/healthRoutes');
const itemRoutes = require('./routes/items');
const auditRoutes = require('./routes/auditRoutes');
const testTaskRoutes = require('./routes/testTasks');
const batchRoutes = require('./routes/batchRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/users');
const rptMastRoutes = require('./routes/rptMastRoutes');
const rptAssRoutes = require('./routes/rptAssRoutes');
const bldgAdjRoutes = require('./routes/bldgAdjRoutes');
const bldgStrucRoutes = require('./routes/bldgStrucRoutes');
const mastExtnRoutes = require('./routes/mastExtnRoutes');
const rptTreeRoutes = require('./routes/rptTreeRoutes');
const rptMachRoutes = require('./routes/rptMachRoutes');

const app = express();

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

// Debug Middleware to trace Cookie/Token flow (After Cookie Parser)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[${req.method} ${req.url}] Cookies: ${JSON.stringify(req.cookies || {})} | Auth Header: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  }
  next();
});

// Swagger Documentation
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
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'access_token',
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
  apis: [path.join(__dirname, './routes/*.js').replace(/\\/g, '/')], // Path to the API docs (normalized for Windows)
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
  customCss: '.swagger-ui .topbar { display: block }'
}));

// Routes
app.use('/health', healthRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/test-tasks', testTaskRoutes);
app.use('/api/v1/batch', batchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/rptmast', rptMastRoutes);
app.use('/api/rpt-ass', rptAssRoutes);
app.use('/api/bldg-adj', bldgAdjRoutes);
app.use('/api/bldg-struc', bldgStrucRoutes);
app.use('/api/mastextn', mastExtnRoutes);
app.use('/api/v1/rpt-tree', rptTreeRoutes);
app.use('/api/v1/rpt-mach', rptMachRoutes);

// Error Handler
app.use(errorHandler);

// Start Server if not imported (for testing)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', err);
    server.close(() => {
      process.exit(1);
    });
  });
}

module.exports = app;
