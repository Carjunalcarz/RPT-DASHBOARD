const { mssqlPrisma, supabasePrisma } = require('../database/prisma');
const { AppError } = require('../middleware/errorHandler');

const getClient = (source) => {
  if (source === 'mssql') return mssqlPrisma;
  if (source === 'supabase') return supabasePrisma;
  return null;
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { source, tableName, action, userId, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    // Default to Supabase if not specified
    const targetSource = source || 'supabase';
    const client = getClient(targetSource);

    if (!client) {
      return next(new AppError('Invalid source. Use "mssql" or "supabase".', 400));
    }

    const where = {};
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [total, logs] = await Promise.all([
      client.auditLog.count({ where }),
      client.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take
      })
    ]);

    // Fetch user details if any userIds exist
    let userMap = {};
    const userIds = [...new Set(logs.filter(log => log.userId && log.userId !== 'system').map(log => log.userId))];
    
    // Filter valid UUIDs only
    const validUserIds = userIds.filter(id => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );

    if (validUserIds.length > 0) {
      try {
        // Always fetch users from Supabase as it's the auth provider
        const users = await supabasePrisma.user.findMany({
          where: {
            id: { in: validUserIds }
          },
          select: {
            id: true,
            email: true
          }
        });
        
        users.forEach(user => {
          userMap[user.id] = user.email;
        });
      } catch (userErr) {
        // Log error but don't fail the request if user fetch fails
        console.error('Failed to fetch user details:', userErr);
      }
    }

    // Parse JSON strings for MSSQL and attach user email
    const formattedLogs = logs.map(log => {
      // Prefer stored email, fallback to lookup
      const email = log.userEmail || (log.userId ? userMap[log.userId] : null);
      const enrichedLog = { ...log, userEmail: email };

      if (targetSource === 'mssql') {
        return {
          ...enrichedLog,
          oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
          newValues: log.newValues ? JSON.parse(log.newValues) : null,
          details: log.details ? JSON.parse(log.details) : null
        };
      }
      return enrichedLog;
    });

    res.status(200).json({
      status: 'success',
      source: targetSource,
      results: formattedLogs.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: formattedLogs
    });

  } catch (err) {
    next(err);
  }
};

exports.deleteAuditLogs = async (req, res, next) => {
  try {
    const { source } = req.query;
    const targetSource = source || 'supabase';
    const client = getClient(targetSource);

    if (!client) {
      return next(new AppError('Invalid source. Use "mssql" or "supabase".', 400));
    }

    // Perform deletion and audit logging in a transaction
    await client.$transaction(async (tx) => {
      // 1. Delete all existing audit logs
      const deleteResult = await tx.auditLog.deleteMany({});

      // 2. Create a new audit log entry recording this action
      // We manually create this because the automatic extension ignores the AuditLog table
      await tx.auditLog.create({
        data: {
          tableName: 'AuditLog',
          recordId: 'ALL',
          action: 'DELETE_ALL',
          userId: req.user.sub || req.user.id || 'system',
          userEmail: req.user.email || req.user.user_metadata?.email || null,
          ipAddress: req.ip || req.connection.remoteAddress || null,
          timestamp: new Date(),
          details: targetSource === 'supabase' 
            ? { count: deleteResult.count, message: 'All audit logs cleared by admin' }
            : JSON.stringify({ count: deleteResult.count, message: 'All audit logs cleared by admin' })
        }
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Audit logs cleared successfully',
      source: targetSource
    });

  } catch (err) {
    next(err);
  }
};
