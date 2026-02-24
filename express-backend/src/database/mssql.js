const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: {
    encrypt: true, // Use this if you're on Windows Azure
    trustServerCertificate: true // Change to false for production
  },
  pool: {
    min: parseInt(process.env.MSSQL_POOL_MIN || '10'),
    max: parseInt(process.env.MSSQL_POOL_MAX || '100'),
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    logger.info('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    logger.error('Database Connection Failed! Bad Config: ', err);
    return null;
  });

module.exports = {
  sql,
  poolPromise
};
