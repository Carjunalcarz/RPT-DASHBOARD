const { poolPromise } = require('../database/mssql');
const { supabase, withRetry } = require('../database/supabase');
const { mssqlPrisma, supabasePrisma } = require('../database/prisma');
const logger = require('../../../utils/logger');

exports.checkMssql = async (req, res, next) => {
  try {
    const start = Date.now();
    const pool = await poolPromise;
    
    if (!pool) {
      throw new Error('MSSQL Connection Pool not initialized');
    }

    // Use raw query or Prisma
    // Let's use Prisma to check ORM connection too
    // But user asked for pool status which is on `mssql` package pool object.
    
    await pool.request().query('SELECT 1');
    
    // Also check Prisma connection
    await mssqlPrisma.$queryRaw`SELECT 1`;

    const duration = Date.now() - start;

    res.status(200).json({
      status: 'success',
      database: 'MSSQL',
      message: 'Connection healthy',
      responseTime: `${duration}ms`,
      pool: {
        min: pool.pool.min,
        max: pool.pool.max,
        size: pool.pool.size,
        available: pool.pool.available,
        pending: pool.pool.pending,
        borrowed: pool.pool.borrowed
      }
    });
  } catch (err) {
    logger.error('MSSQL Health Check Failed', err);
    res.status(503).json({
      status: 'error',
      database: 'MSSQL',
      message: 'Connection unhealthy',
      error: err.message
    });
  }
};

exports.checkSupabase = async (req, res, next) => {
  try {
    const start = Date.now();
    
    // Check Supabase Client (REST)
    if (!supabase) {
      throw new Error('Supabase client not initialized (check environment variables)');
    }

    await withRetry(async () => {
      const { error } = await supabase.from('AuditLog').select('id').limit(1);
      // We ignore error if table doesn't exist, just check connectivity
      // But actually if table doesn't exist, it returns error code 42P01.
      // A better check is maybe `supabase.auth.getSession()` or simple RPC.
      // But let's assume we want to check DB access.
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') { // 42P01 is undefined table
        throw error;
      }
    });

    // Check Prisma Connection
    await supabasePrisma.$queryRaw`SELECT 1`;

    const duration = Date.now() - start;

    res.status(200).json({
      status: 'success',
      database: 'Supabase',
      message: 'Connection healthy',
      responseTime: `${duration}ms`
    });
  } catch (err) {
    logger.error('Supabase Health Check Failed', err);
    res.status(503).json({
      status: 'error',
      database: 'Supabase',
      message: 'Connection unhealthy',
      error: err.message
    });
  }
};
