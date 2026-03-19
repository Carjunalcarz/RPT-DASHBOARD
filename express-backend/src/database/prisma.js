const { PrismaClient: MssqlClient } = require('../generated/mssql-client');
const { PrismaClient: SupabaseClient } = require('../generated/supabase-client-v6');
const { getContext } = require('../utils/context');
const logger = require('../utils/logger');

// Initialize base clients
const mssqlBase = new MssqlClient({
  log: ['error', 'warn'],
});

const supabaseBase = new SupabaseClient({
  log: ['error', 'warn'],
});

/**
 * Creates an extension for audit logging
 * @param {string} clientName - 'MSSQL' or 'Supabase'
 * @param {PrismaClient} baseClient - The base client to use for writing logs
 */
const createAuditExtension = (clientName, baseClient) => {
  return {
    name: 'audit-trail',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip if operation is on AuditLog table itself or readonly
          if (model === 'AuditLog' || !['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'].includes(operation)) {
            return query(args);
          }

          let oldData = null;
          if ((operation === 'update' || operation === 'upsert') && args.where && (args.where.id || args.where.recordId)) {
             try {
               const modelName = model.charAt(0).toLowerCase() + model.slice(1);
               if (baseClient[modelName]) {
                 oldData = await baseClient[modelName].findUnique({ where: args.where });
               }
             } catch (e) { /* Ignore */ }
          }

          const start = Date.now();
          const result = await query(args);
          const duration = Date.now() - start;

          // Log audit asynchronously
          try {
            const context = getContext();
            const userId = context?.user?.id || 'system';
            const ipAddress = context?.ip || null;
            const isSupabase = clientName === 'Supabase';

            const auditData = {
              tableName: model,
              recordId: result && result.id ? String(result.id) : (args.where?.id ? String(args.where.id) : 'N/A'),
              action: operation.toUpperCase(),
              userId: String(userId),
              ipAddress: ipAddress ? String(ipAddress) : null,
              details: isSupabase ? { args, duration } : JSON.stringify({ args, duration }),
              timestamp: new Date(),
            };

            if (operation === 'create') {
              auditData.newValues = isSupabase ? result : JSON.stringify(result);
            } else if (operation === 'update' || operation === 'upsert') {
              auditData.oldValues = oldData ? (isSupabase ? oldData : JSON.stringify(oldData)) : null;
              auditData.newValues = isSupabase ? result : JSON.stringify(result);
            } else if (operation === 'delete') {
              auditData.oldValues = isSupabase ? result : JSON.stringify(result);
            }

            // Write to AuditLog table using base client to avoid recursive hooks
            // Ensure AuditLog model exists in your schema!
            if (baseClient.auditLog) {
              await baseClient.auditLog.create({
                data: auditData
              });
            } else {
              logger.warn(`AuditLog model not found on ${clientName} client`);
            }

          } catch (error) {
            logger.error(`Failed to create audit log for ${clientName}.${model}.${operation}`, error);
          }

          return result;
        },
      },
    },
  };
};

const mssqlPrisma = mssqlBase.$extends(createAuditExtension('MSSQL', mssqlBase));
const supabasePrisma = supabaseBase.$extends(createAuditExtension('Supabase', supabaseBase));

module.exports = {
  mssqlPrisma,
  supabasePrisma
};
