const sql = require('mssql');
const logger = require('../../../utils/logger');

const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  connectionTimeout: parseInt(process.env.MSSQL_CONNECTION_TIMEOUT || '15000'),
  requestTimeout: 60000, // Increase request timeout to 60 seconds
  options: {
    encrypt: true, // Use this if you're on Windows Azure
    trustServerCertificate: true, // Change to false for production
    requestTimeout: 60000, // Ensure it's passed to tedious
  },
  pool: {
    min: parseInt(process.env.MSSQL_POOL_MIN || '10'),
    max: parseInt(process.env.MSSQL_POOL_MAX || '100'),
    idleTimeoutMillis: 30000
  }
};

const isConfigured = () =>
  Boolean(config.user && config.password && config.server && config.database);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let pool = null;
let connecting = null;

const connectOnce = async () => {
  const p = new sql.ConnectionPool(config);
  await p.connect();
  p.on('error', (err) => {
    logger.error('MSSQL pool error', err);
    pool = null;
    connecting = null;
  });
  return p;
};

const getMssqlPool = async (opts = {}) => {
  const retries = Number.isFinite(opts.retries) ? opts.retries : 5;
  const initialDelayMs = Number.isFinite(opts.initialDelayMs) ? opts.initialDelayMs : 500;
  const maxDelayMs = Number.isFinite(opts.maxDelayMs) ? opts.maxDelayMs : 5000;

  if (pool) return pool;
  if (connecting) return connecting;

  if (!isConfigured()) {
    const err = new Error('MSSQL is not configured (missing MSSQL_* environment variables)');
    logger.error(err.message);
    throw err;
  }

  connecting = (async () => {
    let delay = initialDelayMs;
    let lastErr;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const connectedPool = await connectOnce();
        pool = connectedPool;
        logger.info('Connected to MSSQL');
        return pool;
      } catch (err) {
        lastErr = err;
        logger.error(`MSSQL connect attempt ${attempt}/${retries} failed`, err);
        pool = null;

        if (attempt < retries) {
          await sleep(delay);
          delay = Math.min(delay * 2, maxDelayMs);
        }
      }
    }

    connecting = null;
    throw lastErr || new Error('MSSQL connection failed');
  })();

  try {
    return await connecting;
  } catch (err) {
    connecting = null;
    throw err;
  }
};

const poolPromise = {
  then: (resolve, reject) => getMssqlPool().then(resolve, reject),
};

module.exports = {
  sql,
  poolPromise,
  getMssqlPool
};
